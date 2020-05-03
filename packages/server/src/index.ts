import log from "@presenti/logging";
import "reflect-metadata";
import { App, TemplatedApp } from "uWebSockets.js";
import { RESTAdapterV2 } from "./adapters/presence/rest-adapter";
import { RemoteAdatpterV2 } from "./adapters/presence/socket-adapter";
import { GradientState } from "./adapters/state/gradient-state";
import { EventBus, Events } from "./event-bus";
import { PresenceRESTOutput } from "./outputs/presence-rest";
import { PresenceStreamOutput } from "./outputs/presence-stream";
import NativeClient from "./structs/native-client";
import { PresenceOutput, PresenceProvider } from "./structs/output";
import { PresentiModuleClasses } from "./structs/presenti-module";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-base";
import { StateAdapter } from "./structs/state";
import { AdapterSupervisor } from "./supervisors/adapter-supervisor";
import { StateSupervisor } from "./supervisors/state-supervisor";
import { PresenceDictionary } from "./utils/utils-index";

/**
 * Tracks global and scoped (per-user presence)
 */
export class PresenceService implements PresenceProvider {
  /** logging instance */
  log = log.child({ name: "Presenti" });
  /** WebSocket and Web server */
  app: TemplatedApp;
  /** reference to the adapter supervisor */
  adapterSupervisor: AdapterSupervisor;
  /** reference to the state supervisor */
  stateSupervisor: StateSupervisor;
  /** Native client for modules running on the server process */
  nativeClient: NativeClient;
  /** Array of outputs that send out assembled presence payloads */
  outputs: PresenceOutput[] = [];

  presences: PresenceDictionary = {};
  states: Record<string, Record<string, any>> = {};

  constructor(private port: number, private userQuery: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>) {
    this.app = App();
    this.nativeClient = new NativeClient();
    this.nativeClient.on("updated", ({ scope }) => {
      this.adapterSupervisor.updated(scope);
    });

    this.registerAdapters();
    this.registerStates();
    this.registerOutputs();
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
    this.outputs.push(new PresenceStreamOutput(this, this.app));
    this.outputs.push(new PresenceRESTOutput(this, this.app));
  }

  /**
   * Returns the presence for a given scope
   * @param scope scope
   */
  async presence(scope: string, initial: boolean = false, refresh: boolean = false) {
    if (!this.presences[scope] || refresh) this.presences[scope] = await this.adapterSupervisor.scopedData(scope);

    return this.presences[scope];
  }

  /**
   * Returns the state for a given scope
   * @param scope scope
   * @param initial whether this should be treated as a "new" state
   */
  async state(scope: string, initial: boolean = false, refresh: boolean = false) {
    if (!this.states[scope] || initial || refresh) this.states[scope] = await this.stateSupervisor.scopedData(scope, initial);

    return this.states[scope];
  }

  /**
   * Initializes adapters and preloads presences/states
   */
  async bootstrap() {
    await this.adapterSupervisor.run();
    await this.stateSupervisor.run();
    await Promise.all(this.outputs.map(output => output.run()));

    this.presences = await this.adapterSupervisor.scopedDatas();
    this.states = await this.stateSupervisor.scopedDatas();

    this.log.info(`Bootstrapped Presenti with ${Object.keys(this.presences).length} presence(s) and ${Object.keys(this.states).length} state(s)`);
  }
  
  /**
   * Starts the presence service
   */
  async run(modules: PresentiModuleClasses = {Adapters: {}, Entities: {}, Configs: {}, Outputs: {}}) {
    for (let [ name, adapterClass ] of Object.entries(modules.Adapters)) {
      this.log.info(`Loading module adapter ${name}`);
      const { [name.split(".")[0]]: config } = modules.Configs;
      const adapter = new adapterClass(config, this.nativeClient);
      if (adapter instanceof StateAdapter) this.stateSupervisor.register(adapter);
      else this.adapterSupervisor.register(adapter);
    }
    for (let [ name, outputClass ] of Object.entries(modules.Outputs)) {
      this.log.info(`Loading output ${name}`);
      const { [name.split(".")[0]]: config } = modules.Configs;
      const output = new outputClass(this, this.app, config);
      this.outputs.push(output);
    }

    await this.bootstrap();
    await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
  }
}

export * from "./adapters/presence/rest-adapter";
export * from "./adapters/presence/socket-adapter";
export * from "./adapters/state/gradient-state";
export * from "./structs/adapter";
export * from "./structs/scoped-adapter";
export * from "./structs/socket-api-base";
export * from "./structs/state";
export * from "./structs/supervisor";
export * from "./supervisors/adapter-supervisor";
export * from "./supervisors/state-supervisor";
export * from "./utils";
export * from "./web";
