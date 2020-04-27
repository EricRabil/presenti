import "reflect-metadata";
import { isRemotePayload, PayloadType } from "remote-presence-utils";
import { App, TemplatedApp, WebSocket } from "uWebSockets.js";
import { DiscordAdapter } from "./adapters/DiscordAdapter";
import { RemoteAdatpterV2 } from "./adapters/RemoteAdapterV2";
import { RESTAdapterV2 } from "./adapters/RESTAdapaterV2";
import { CONFIG } from "./Configuration";
import { MasterSupervisor } from "./MasterSupervisor";
import { GradientState } from "./state/GradientState";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-adapter";
import { AdapterSupervisor } from "./supervisors/AdapterSupervisor";
import { StateSupervisor } from "./supervisors/StateSupervisor";
import { log } from "./utils";

/**
 * Tracks global and scoped (per-user presence)
 */
export class PresenceService {
  supervisor: MasterSupervisor = new MasterSupervisor();
  app: TemplatedApp;
  clients: Record<string, WebSocket[]> = {};
  idMap: Map<WebSocket, string> = new Map();
  scopedPayloads: Record<string, Record<string, any>> = {};
  globalPayload: Record<string, any> = {};
  adapterSupervisor: AdapterSupervisor;
  log = log.child({ name: "Presenti" });

  constructor(private port: number, private userQuery: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>) {
    this.app = App();
    this.supervisor = new MasterSupervisor();
    this.supervisor.on("updated", (scope) => this.dispatch(scope, true));

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
    const adapterSupervisor = this.adapterSupervisor = new AdapterSupervisor(this.app);

    adapterSupervisor.register(new RemoteAdatpterV2(this.app));
    adapterSupervisor.register(new RESTAdapterV2(this.app));
    if (CONFIG.discord) adapterSupervisor.register(new DiscordAdapter(CONFIG.discord));

    this.supervisor.register(adapterSupervisor);
  }

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

  async payloadForSelector(selector: string, newSocket: boolean = false, refresh: boolean  = false) {
    if (!this.scopedPayloads[selector] || refresh) this.scopedPayloads[selector] = await this.supervisor.scopedData(selector, newSocket);
    if (!this.globalPayload) this.globalPayload = await this.supervisor.globalData(newSocket);

    return Object.assign({}, this.globalPayload, this.scopedPayloads[selector]);
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
  async run() {
    await this.supervisor.run();
    
    this.scopedPayloads = await this.supervisor.scopedDatas();
    this.log.debug(`Bootstrapped Presenti with ${Object.keys(this.scopedPayloads).length} payloads to serve`);

    await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
  }
}

export { DiscordAdapter } from "./adapters/DiscordAdapter";
export { SpotifyAdapter } from "./adapters/SpotifyAdapter";
