import { App, WebSocket, TemplatedApp } from "uWebSockets.js";
import { Presence, isRemotePayload, PayloadType, PresenceStruct } from "remote-presence-utils";
import { AdapterSupervisor } from "./supervisors/AdapterSupervisor";
import { RemoteAdapter } from "./adapters/RemoteAdapter";
import { RESTAdapter } from "./adapters/RESTAdapter";
import { PresentiKit } from "./utils";
import { MasterSupervisor } from "./MasterSupervisor";
import { StateSupervisor } from "./supervisors/StateSupervisor";
import { GradientState } from "./state/GradientState";

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

  constructor(private port: number, private userQuery: (token: string) => Promise<string | null>) {
    this.app = App();
    this.supervisor = new MasterSupervisor();
    this.supervisor.on("updated", (scope) => this.dispatch(scope));

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
    const adapterSupervisor = new AdapterSupervisor(this.app);

    adapterSupervisor.register(new RemoteAdapter(this.app, this.userQuery))
    adapterSupervisor.register(new RESTAdapter(this.app, this.userQuery));

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
  async dispatchToSelector(selector: string) {
    const clients = this.clients[selector];
    if (!clients || clients.length === 0) return;
    const payload = JSON.stringify(await this.payloadForSelector(selector));

    await Promise.all(
      clients.map(client => (
        client.send(payload)
      ))
    );
  }

  async payloadForSelector(selector: string, newSocket: boolean = false) {
    this.scopedPayloads[selector] = await this.supervisor.scopedData(selector, newSocket);
    this.globalPayload = await this.supervisor.globalData(newSocket);

    return Object.assign({}, this.globalPayload, this.scopedPayloads[selector]);
  }

  /**
   * Dispatches to a set of selectors, or all connected users
   * @param selector selectors to dispatch to
   */
  async dispatch(selector?: string | string[]) {
    if (!selector) selector = Object.keys(this.clients);
    else if (!Array.isArray(selector)) selector = [selector];

    return selector.map(sel => this.dispatchToSelector(sel));
  }
  
  /**
   * Starts the presence service
   */
  async run() {
    await this.supervisor.run();
    await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
  }
}

export { SpotifyAdapter } from "./adapters/SpotifyAdapter";
export { DiscordAdapter } from "./adapters/DiscordAdapter";