import "reflect-metadata";
import { ObjectCache, PresenceCacheBuilder, StateCacheBuilder } from "@presenti/core-cache";
import log from "@presenti/logging";
import { AdapterSupervisor, PresenceOutput, PresenceProvider, PresentiModuleClasses, StateAdapter, StateSupervisor, SubscribableEvents } from "@presenti/modules";
import { DecentralizedPresenceStream } from "@presenti/shared-infrastructure";
import { debounce, Events, FIRST_PARTY_SCOPE, PresenceServer } from "@presenti/utils";
import { APIError, SharedPresentiWebController } from "@presenti/web";
import IORedis from "ioredis";
import { App, TemplatedApp } from "uWebSockets.js";
import { RESTAdapterV2 } from "./adapters/presence/rest-adapter";
import { RemoteAdatpterV2 } from "./adapters/presence/socket-adapter";
import { GradientState } from "./adapters/state/gradient-state";
import { TransformationsAPI } from "./api/transformations";
import { EventBus } from "./event-bus";
import { PresenceRESTOutput } from "./outputs/presence-rest";
import NativeClient from "./structs/native-client";
import { CONFIG } from "./utils";
import { UserLoader } from "./web/middleware/loaders";

export var SharedPresenceService: PresenceService;

/**
 * Tracks global and scoped (per-user presence)
 */
export class PresenceService implements PresenceProvider, PresenceServer {
  /** logging instance */
  log = log.child({ name: "Presenti" });
  /** WebSocket and Web server */
  app: TemplatedApp;
  /** reference to the adapter supervisor */
  adapterSupervisor: AdapterSupervisor;
  /** reference to the state supervisor */
  stateSupervisor: StateSupervisor;
  /** Native client for modules running on the server process */
  client: NativeClient;
  /** Array of outputs that send out assembled presence payloads */
  outputs: PresenceOutput[] = [];
  /** IORedis Connection */
  redis = new IORedis(CONFIG.cache);
  /** IORedis event connection */
  redisEvents = new IORedis(CONFIG.cache);

  presences = PresenceCacheBuilder(this.redis, this.redisEvents);
  states = StateCacheBuilder(this.redis, this.redisEvents);
  resolvedScopes = new ObjectCache<string>("scopes", this.redis);

  web = {
    loaders: {
      UserLoader: UserLoader
    }
  };

  oauthDefinitions: PresentiModuleClasses["OAuth"] = [];

  get config() {
    return CONFIG;
  }

  constructor(private port: number, private userQuery: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>) {
    SharedPresenceService = SharedPresentiWebController.server = this;

    this.redisEvents.on("message", (channel, message) => ObjectCache.receiveEvent(channel, message, [this.presences, this.states]));

    this.app = App();
    this.client = new NativeClient();
    this.client.on("updated", ({ scope }) => {
      this.adapterSupervisor.updated(scope);
    });

    this.registerAdapters();
    this.registerStates();
    this.registerOutputs();
    this.bindCleanupListeners();
  }

  bindCleanupListeners() {
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((ev: any) => process.on(ev, () => this.cleanup()));
  }

  /** Called when the process is going to exit. */
  cleaning = false;
  cleanup() {
    if (this.cleaning) return;
    this.cleaning = true;

    this.log.info('Cleaning up...');

    this.presences.beforeExit().then(() => {
        this.log.info('Thank you, and goodnight.');

        process.exit(0);
    });
  }

  /**
   * Registers all adapters with the supervisor
   */
  registerAdapters() {
    const adapterSupervisor = this.adapterSupervisor = new AdapterSupervisor();

    adapterSupervisor.register(new RemoteAdatpterV2(this.app));
    adapterSupervisor.register(new RESTAdapterV2(this.app));

    adapterSupervisor.on("updated", async scope => scope && EventBus.emit(Events.PRESENCE_UPDATE, {
      scope,
      presence: await this.presence(scope, false, true)
    }));
  }

  /** Registers state adapters with the supervisor */
  registerStates() {
    const stateSupervisor = this.stateSupervisor = new StateSupervisor();

    stateSupervisor.register(new GradientState(this));

    stateSupervisor.on("updated", async scope => scope && EventBus.emit(Events.STATE_UPDATE, {
      scope,
      state: await this.state(scope, false, true)
    }));
  }

  registerOutputs() {
    this.outputs.push(new DecentralizedPresenceStream(this, this.app));
    this.outputs.push(new PresenceRESTOutput(this, this.app));
  }

  subscribe(output: PresenceOutput, events: SubscribableEvents[]) {
    const handler = debounce(({ scope }) => output.updated(scope), 250);
    events.forEach(event => EventBus.on(event, handler));
  }

  /**
   * Returns the presence for a given scope
   * @param scope scope
   */
  async presence(scope: string, initial: boolean = false, refresh: boolean = false) {
    if (!(await this.presences.exists(scope)) || refresh) {
      let presences = await this.adapterSupervisor.scopedData(scope);

      const transformed = await TransformationsAPI.applyTransformationsForScope(scope, presences);

      presences = transformed instanceof APIError ? presences : transformed;
      await this.presences.set(scope, presences);
    }

    return (await this.presences.get(scope)) || [];
  }

  /**
   * Returns the state for a given scope
   * @param scope scope
   * @param initial whether this should be treated as a "new" state
   */
  async state(scope: string, initial: boolean = false, refresh: boolean = false) {
    if (!(await this.states.exists(scope)) || initial || refresh) {
      const states = await this.stateSupervisor.scopedData(scope, initial);
      await this.states.set(scope, states);
      return states;
    }

    return await this.states.get(scope) || {};
  }

  /**
   * Initializes adapters and preloads presences/states
   */
  async bootstrap() {
    await this.adapterSupervisor.run();
    await this.stateSupervisor.run();
    await Promise.all(this.outputs.map(output => output.run()));

    const presenceLength = await this.presences.setBulk(await this.adapterSupervisor.scopedDatas());
    const stateLength = await this.states.setBulk(await this.stateSupervisor.scopedDatas());

    this.log.info(`Bootstrapped Presenti with ${presenceLength} presence(s) and ${stateLength} state(s)`);
  }
  
  /**
   * Starts the presence service
   */
  async run(modules: PresentiModuleClasses = {Adapters: {}, Entities: {}, Configs: {}, Outputs: {}, OAuth: []}) {
    for (let [ name, adapterClass ] of Object.entries(modules.Adapters)) {
      this.log.info(`Loading module adapter ${name}`);
      const { [name.split(".")[0]]: config } = modules.Configs;
      const adapter = new adapterClass(config, this.client);
      if (adapter instanceof StateAdapter) this.stateSupervisor.register(adapter);
      else this.adapterSupervisor.register(adapter);
    }
    for (let [ name, outputClass ] of Object.entries(modules.Outputs)) {
      this.log.info(`Loading output ${name}`);
      const { [name.split(".")[0]]: config } = modules.Configs;
      const output = new outputClass(this, this.app, config);
      this.outputs.push(output);
    }

    this.oauthDefinitions = modules.OAuth;

    await this.bootstrap();
    await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
  }
}

export * from "./adapters/presence/rest-adapter";
export * from "./adapters/presence/socket-adapter";
export * from "./adapters/state/gradient-state";
export * from "./utils";
export * from "./web";

