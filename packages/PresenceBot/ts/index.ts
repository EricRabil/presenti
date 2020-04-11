import { Client, Activity } from "discord.js";
import fs from "fs-extra";
import got from "got";
import path from "path";
import splashy from "splashy";
import { App, WebSocket, TemplatedApp } from "uWebSockets.js";
import { PresenceAdapter, AdapterState, Presence } from "./adapter";
import { SpotifyAdapter } from "./adapters/SpotifyAdapter";
import { DiscordAdapter } from "./adapters/DiscordAdapter";
import { AdapterSupervisor, SupervisorUpdateEvent } from "./AdapterSupervisor";
import { RemoteAdapter } from "./adapters/RemoteAdapter";

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, "..", "config.json");
const scdn = (tag: string) => `https://i.scdn.co/image/${tag}`

const config = {
  token: "",
  user: "",
  spotifyCookies: "",
  port: 8138
};

if (!fs.pathExistsSync(CONFIG_PATH)) {
  fs.writeJSONSync(CONFIG_PATH, config, { spaces: 4 });
} else {
  Object.assign(config, fs.readJSONSync(CONFIG_PATH));
}

if (!config.token) {
  console.log('Please configure PresenceBot! No token was provided.');
  process.exit(1);
}

const user: Record<string, string> = {
  'token1': 'eric',
  'token2': 'justin'
}

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

  constructor() {
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
    this.supervisor.register(new RemoteAdapter(this.app, async token => user[token]))
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
    await new Promise(resolve => this.app.listen('0.0.0.0', config.port, resolve));
  }
}

const service = new PresenceService();
service.run().then(() => {
  console.log('Service is running!');
});

export { RemoteClient as default } from "./RemoteClient";
export { SpotifyAdapter } from "./adapters/SpotifyAdapter";
export { DiscordAdapter } from "./adapters/DiscordAdapter";