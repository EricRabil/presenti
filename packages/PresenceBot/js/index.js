"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const uWebSockets_js_1 = require("uWebSockets.js");
const AdapterSupervisor_1 = require("./AdapterSupervisor");
const RemoteAdapter_1 = require("./adapters/RemoteAdapter");
const CONFIG_PATH = process.env.CONFIG_PATH || path_1.default.resolve(__dirname, "..", "config.json");
const scdn = (tag) => `https://i.scdn.co/image/${tag}`;
const config = {
    token: "",
    user: "",
    spotifyCookies: "",
    port: 8138
};
if (!fs_extra_1.default.pathExistsSync(CONFIG_PATH)) {
    fs_extra_1.default.writeJSONSync(CONFIG_PATH, config, { spaces: 4 });
}
else {
    Object.assign(config, fs_extra_1.default.readJSONSync(CONFIG_PATH));
}
if (!config.token) {
    console.log('Please configure PresenceBot! No token was provided.');
    process.exit(1);
}
const user = {
    'token1': 'eric',
    'token2': 'justin'
};
/**
 * Tracks global and scoped (per-user presence)
 */
class PresenceService {
    constructor() {
        this.clients = {};
        this.idMap = new Map();
        this.scopedPayloads = {};
        this.globalPayload = [];
        this.app = uWebSockets_js_1.App();
        this.supervisor = new AdapterSupervisor_1.AdapterSupervisor(this.app);
        this.supervisor.on("updated", ({ $selector }) => this.dispatch($selector));
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
    latest(id) {
        return this.globalPayload.concat(id ? this.scopedPayloads[id] : []);
    }
    /**
     * Allocates resources to a websocket with a scope ID
     * @param id scope ID
     * @param socket socket
     */
    mountClient(id, socket) {
        const clients = (this.clients[id] || (this.clients[id] = []));
        if (clients.includes(socket))
            return;
        this.idMap.set(socket, id);
        clients.push(socket);
    }
    /**
     * Deallocates resources for a websocket
     * @param socket socket to deallocate
     */
    unmountClient(socket) {
        const id = this.idMap.get(socket);
        if (!id)
            return;
        const clients = (this.clients[id] || (this.clients[id] = []));
        if (!clients.includes(socket))
            return;
        clients.splice(clients.indexOf(socket), 1);
        this.idMap.delete(socket);
    }
    /**
     * Registers all adapters with the supervisor
     */
    registerAdapters() {
        this.supervisor.register(new RemoteAdapter_1.RemoteAdapter(this.app, async (token) => user[token]));
    }
    /**
     * Dispatches the latest presence state to the given selector
     * @param selector selector to dispatch to
     */
    async dispatchToSelector(selector) {
        const clients = this.clients[selector];
        if (!clients || clients.length === 0)
            return;
        this.scopedPayloads[selector] = await this.supervisor.scopedActivities(selector);
        this.globalPayload = await this.supervisor.globalActivities();
        const payload = JSON.stringify({
            activities: this.latest(selector)
        });
        await Promise.all(clients.map(client => (client.send(payload))));
    }
    /**
     * Dispatches to a set of selectors, or all connected users
     * @param selector selectors to dispatch to
     */
    async dispatch(selector) {
        if (!selector)
            selector = Object.keys(this.clients);
        else if (!Array.isArray(selector))
            selector = [selector];
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
exports.PresenceService = PresenceService;
const service = new PresenceService();
service.run().then(() => {
    console.log('Service is running!');
});
var RemoteClient_1 = require("./RemoteClient");
exports.default = RemoteClient_1.RemoteClient;
var SpotifyAdapter_1 = require("./adapters/SpotifyAdapter");
exports.SpotifyAdapter = SpotifyAdapter_1.SpotifyAdapter;
var DiscordAdapter_1 = require("./adapters/DiscordAdapter");
exports.DiscordAdapter = DiscordAdapter_1.DiscordAdapter;
