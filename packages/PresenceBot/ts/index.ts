import { App, WebSocket, TemplatedApp } from "uWebSockets.js";
import { Presence } from "remote-presence-utils";
import { AdapterSupervisor } from "./AdapterSupervisor";
import { RemoteAdapter } from "./adapters/RemoteAdapter";
import { RESTAdapter } from "./adapters/RESTAdapter";

/**
 * Tracks global and scoped (per-user presence)
 */
export class PresenceService {
  supervisor: AdapterSupervisor;
  app: TemplatedApp;
  clients: Record<string, WebSocket[]> = {};
  idMap: Map<WebSocket, string> = new Map();
  scopedPayloads: Record<string, Presence[]> = {};
  globalPayload: Presence[] = [];

  constructor(private port: number, private userQuery: (token: string) => Promise<string | null>) {
    this.app = App();
    this.supervisor = new AdapterSupervisor(this.app);

    this.supervisor.on("updated", ({$selector}) => this.dispatch($selector));

    this.app.ws('/presence/:id', {
      open: (ws, req) => {
        const id = req.getParameter(0);
        this.mountClient(id, ws);
        ws.send(JSON.stringify({
          activities: this.latest(id)
        }));
      },
      close: (ws, code, message) => {
        this.unmountClient(ws);
      }
    });

    this.registerAdapters();
  }

  /**
   * Merges latest global payload with the latest scoped payload
   * @param id scope id
   */
  latest(id?: string) {
    return this.globalPayload.concat(id ? this.scopedPayloads[id] : []);
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
    this.supervisor.register(new RemoteAdapter(this.app, this.userQuery))
    this.supervisor.register(new RESTAdapter(this.app, this.userQuery));
  }

  /**
   * Dispatches the latest presence state to the given selector
   * @param selector selector to dispatch to
   */
  async dispatchToSelector(selector: string) {
    const clients = this.clients[selector];
    if (!clients || clients.length === 0) return;
    this.scopedPayloads[selector] = await this.supervisor.scopedActivities(selector);
    this.globalPayload = await this.supervisor.globalActivities();

    const payload = JSON.stringify({
      activities: this.latest(selector)
    });

    await Promise.all(
      clients.map(client => (
        client.send(payload)
      ))
    );
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
    await this.supervisor.initialize();
    await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
  }
}

export { SpotifyAdapter } from "./adapters/SpotifyAdapter";
export { DiscordAdapter } from "./adapters/DiscordAdapter";