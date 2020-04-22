"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const remote_presence_utils_1 = require("remote-presence-utils");
const AdapterSupervisor_1 = require("./supervisors/AdapterSupervisor");
const RemoteAdapter_1 = require("./adapters/RemoteAdapter");
const RESTAdapter_1 = require("./adapters/RESTAdapter");
const MasterSupervisor_1 = require("./MasterSupervisor");
const StateSupervisor_1 = require("./supervisors/StateSupervisor");
const GradientState_1 = require("./state/GradientState");
/**
 * Tracks global and scoped (per-user presence)
 */
class PresenceService {
    constructor(port, userQuery) {
        this.port = port;
        this.userQuery = userQuery;
        this.supervisor = new MasterSupervisor_1.MasterSupervisor();
        this.clients = {};
        this.idMap = new Map();
        this.scopedPayloads = {};
        this.globalPayload = {};
        this.app = uWebSockets_js_1.App();
        this.supervisor = new MasterSupervisor_1.MasterSupervisor();
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
        this.registerStates();
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
        const adapterSupervisor = new AdapterSupervisor_1.AdapterSupervisor(this.app);
        adapterSupervisor.register(new RemoteAdapter_1.RemoteAdapter(this.app, this.userQuery));
        adapterSupervisor.register(new RESTAdapter_1.RESTAdapter(this.app, this.userQuery));
        this.supervisor.register(adapterSupervisor);
    }
    registerStates() {
        const stateSupervisor = new StateSupervisor_1.StateSupervisor();
        stateSupervisor.register(new GradientState_1.GradientState());
        this.supervisor.register(stateSupervisor);
    }
    /**
     * Dispatches the latest presence state to the given selector
     * @param selector selector to dispatch to
     */
    async dispatchToSelector(selector) {
        const clients = this.clients[selector];
        if (!clients || clients.length === 0)
            return;
        const payload = JSON.stringify(await this.payloadForSelector(selector));
        await Promise.all(clients.map(client => (client.send(payload))));
    }
    async payloadForSelector(selector, newSocket = false) {
        this.scopedPayloads[selector] = await this.supervisor.scopedData(selector, newSocket);
        this.globalPayload = await this.supervisor.globalData(newSocket);
        return Object.assign({}, this.globalPayload, this.scopedPayloads[selector]);
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
        await this.supervisor.run();
        await new Promise(resolve => this.app.listen('0.0.0.0', this.port, resolve));
    }
}
exports.PresenceService = PresenceService;
var SpotifyAdapter_1 = require("./adapters/SpotifyAdapter");
exports.SpotifyAdapter = SpotifyAdapter_1.SpotifyAdapter;
var DiscordAdapter_1 = require("./adapters/DiscordAdapter");
exports.DiscordAdapter = DiscordAdapter_1.DiscordAdapter;
