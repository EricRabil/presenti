"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const remote_presence_utils_1 = require("remote-presence-utils");
const AdapterSupervisor_1 = require("./AdapterSupervisor");
const RemoteAdapter_1 = require("./adapters/RemoteAdapter");
const RESTAdapter_1 = require("./adapters/RESTAdapter");
const utils_1 = require("./utils");
/**
 * Tracks global and scoped (per-user presence)
 */
class PresenceService {
    constructor(port, userQuery) {
        this.port = port;
        this.userQuery = userQuery;
        this.clients = {};
        this.idMap = new Map();
        this.scopedPayloads = {};
        this.globalPayload = [];
        this.shades = {};
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
            message: (ws, msg) => {
                const rawStr = Buffer.from(msg).toString('utf8');
                var parsed;
                try {
                    parsed = JSON.parse(rawStr);
                }
                catch (e) {
                    ws.close();
                    return;
                }
                if (!remote_presence_utils_1.isRemotePayload(parsed))
                    return;
                switch (parsed.type) {
                    case remote_presence_utils_1.PayloadType.PING:
                        ws.send(JSON.stringify({ type: remote_presence_utils_1.PayloadType.PONG }));
                        break;
                }
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
        return this.globalPayload.concat(id ? this.scopedPayloads[id] : []).filter(a => typeof a === "object" && a !== null);
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
        this.supervisor.register(new RemoteAdapter_1.RemoteAdapter(this.app, this.userQuery));
        this.supervisor.register(new RESTAdapter_1.RESTAdapter(this.app, this.userQuery));
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
        await Promise.all(this.latest(selector).map(async (presence) => {
            var _a;
            if (!presence || !presence.gradient)
                return;
            if (typeof presence.gradient === "object" && presence.gradient.enabled === false)
                return;
            const link = typeof presence.image === "string" ? presence.image : (_a = presence.image) === null || _a === void 0 ? void 0 : _a.src;
            if (!link)
                return;
            presence.shades = this.shades[link] = (this.shades[link] || await utils_1.PresentiKit.generatePalette(link));
            console.log(presence.shades);
        }));
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
        await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
    }
}
exports.PresenceService = PresenceService;
var SpotifyAdapter_1 = require("./adapters/SpotifyAdapter");
exports.SpotifyAdapter = SpotifyAdapter_1.SpotifyAdapter;
var DiscordAdapter_1 = require("./adapters/DiscordAdapter");
exports.DiscordAdapter = DiscordAdapter_1.DiscordAdapter;
