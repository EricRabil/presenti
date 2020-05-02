import "reflect-metadata";
import { isRemotePayload, PayloadType } from "@presenti/utils";
import { App, TemplatedApp, WebSocket } from "uWebSockets.js";
import { RemoteAdatpterV2 } from "./adapters/presence/socket-adapter";
import { RESTAdapterV2 } from "./adapters/presence/rest-adapter";
import { MasterSupervisor } from "./supervisors/master-supervisor";
import { GradientState } from "./adapters/state/gradient-state";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-base";
import { AdapterSupervisor } from "./supervisors/adapter-supervisor";
import { StateSupervisor } from "./supervisors/state-supervisor";
import { log } from "./utils/logging";
import { PresentiModuleClasses } from "./structs/presenti-module";
import NativeClient from "./structs/native-client";

/**
 * Tracks global and scoped (per-user presence)
 */
export class PresenceService {
  /** Supervisor that tracks supervisors */
  supervisor: MasterSupervisor = new MasterSupervisor();
  /** WebSocket and Web server */
  app: TemplatedApp;
  /** Record of <scope, connections> */
  clients: Record<string, WebSocket[]> = {};
  /** Record of <connection, scope> */
  idMap: Map<WebSocket, string> = new Map();
  /** Record of <scope, latest payload> */
  scopedPayloads: Record<string, Record<string, any>> = {};
  /** Record of latest global payload */
  globalPayload: Record<string, any> = {};
  /** reference to the adapter supervisor */
  adapterSupervisor: AdapterSupervisor;
  /** logging instance */
  log = log.child({ name: "Presenti" });
  /** Native client for modules running on the server process */
  nativeClient: NativeClient;

  constructor(private port: number, private userQuery: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>) {
    this.app = App();
    this.supervisor = new MasterSupervisor();
    this.supervisor.on("updated", (scope) => this.dispatch(scope, true));
    this.nativeClient = new NativeClient();
    this.nativeClient.on("updated", ({ scope }) => {
      console.log(scope);
      this.adapterSupervisor.updated(scope);
    });

    /** presence streaming endpoint */
    this.app.ws('/presence/:id', {
      open: async (ws, req) => {
        const id = req.getParameter(0);
        this.mountClient(id, ws);
        ws.send(JSON.stringify(await this.payloadForSelector(id, true)));
      },
      message: (ws, msg) => {
        const rawStr = Buffer.from(msg).toString('utf8');
        var parsed;
        try {
          parsed = JSON.parse(rawStr);
        } catch (e) {
          ws.close();
          return;
        }
        if (!isRemotePayload(parsed)) return;

        switch (parsed.type) {
          case PayloadType.PING:
            ws.send(JSON.stringify({type: PayloadType.PONG}));
            break;
        }
      },
      close: (ws, code, message) => {
        this.unmountClient(ws);
      }
    });

    this.registerAdapters();
    this.registerStates();
  }

  /**
   * Allocates resources to a websocket with a scope ID
   * @param id scope ID
   * @param socket socket
   */
  mountClient(id: string, socket: WebSocket) {
    const clients = (this.clients[id] || (this.clients[id] = []));
    if (clients.includes(socket)) return;
    this.idMap.set(socket, id);
    clients.push(socket);
  }

  /**
   * Deallocates resources for a websocket
   * @param socket socket to deallocate
   */
  unmountClient(socket: WebSocket) {
    const id = this.idMap.get(socket);
    if (!id) return;
    const clients = (this.clients[id] || (this.clients[id] = []));
    if (!clients.includes(socket)) return;
    clients.splice(clients.indexOf(socket), 1);
    this.idMap.delete(socket);
  }

  /**
   * Registers all adapters with the supervisor
   */
  registerAdapters() {
    const adapterSupervisor = this.adapterSupervisor = new AdapterSupervisor();

    adapterSupervisor.register(new RemoteAdatpterV2(this.app));
    adapterSupervisor.register(new RESTAdapterV2(this.app));

    this.supervisor.register(adapterSupervisor);
  }

  /** Registers state adapters with the supervisor */
  registerStates() {
    const stateSupervisor = new StateSupervisor();

    stateSupervisor.register(new GradientState());

    this.supervisor.register(stateSupervisor);
  }

  /**
   * Dispatches the latest presence state to the given selector
   * @param selector selector to dispatch to
   */
  async dispatchToSelector(selector: string, refresh: boolean = false) {
    const clients = this.clients[selector];
    if (!clients || clients.length === 0) return;
    const payload = JSON.stringify(await this.payloadForSelector(selector, false, refresh));

    await Promise.all(
      clients.map(client => (
        client.send(payload)
      ))
    );
  }

  /**
   * Returns the latest payload for a scope, querying adapters if none has been cached already
   * @param scope
   * @param newSocket is this payload being sent for a new connection?
   * @param refresh should the cache be refreshed?
   */
  async payloadForSelector(scope: string, newSocket: boolean = false, refresh: boolean  = false) {
    if (!this.scopedPayloads[scope] || refresh) this.scopedPayloads[scope] = await this.supervisor.scopedData(scope, newSocket);
    if (!this.globalPayload) this.globalPayload = await this.supervisor.globalData(newSocket);

    return Object.assign({}, this.globalPayload, this.scopedPayloads[scope]);
  }

  /**
   * Dispatches to a set of selectors, or all connected users
   * @param selector selectors to dispatch to
   */
  async dispatch(selector?: string | string[], refresh: boolean = false) {
    if (!selector) selector = Object.keys(this.clients);
    else if (!Array.isArray(selector)) selector = [selector];

    return selector.map(sel => this.dispatchToSelector(sel, refresh));
  }
  
  /**
   * Starts the presence service
   */
  async run(modules: PresentiModuleClasses = {Adapters: {}, Entities: {}, Configs: {}}) {
    for (let [ name, adapterClass ] of Object.entries(modules.Adapters)) {
      this.log.info(`Loading module adapter ${name}`);
      const { [name.split(".")[0]]: config } = modules.Configs;
      const adapter = new adapterClass(config, this.nativeClient);
      this.adapterSupervisor.register(adapter);
    }

    await this.supervisor.run();
    
    this.scopedPayloads = await this.supervisor.scopedDatas();
    this.log.debug(`Bootstrapped Presenti with ${Object.keys(this.scopedPayloads).length} payloads to serve`);

    await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
  }
}

export * from "./adapters/presence/rest-adapter";
export * from "./adapters/presence/socket-adapter";
export * from "./adapters/state/gradient-state";
export * from "./supervisors/adapter-supervisor";
export * from "./supervisors/state-supervisor";
export * from "./supervisors/master-supervisor";
export * from "./structs/adapter";
export * from "./structs/rest-api-base";
export * from "./structs/scoped-adapter";
export * from "./structs/socket-api-base";
export * from "./structs/state";
export * from "./structs/supervisor";
export * from "./utils";
export * from "./web";