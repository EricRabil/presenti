"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const remote_presence_utils_1 = require("remote-presence-utils");
const uWebSockets_js_1 = require("uWebSockets.js");
const DiscordAdapter_1 = require("./adapters/DiscordAdapter");
const RemoteAdapterV2_1 = require("./adapters/RemoteAdapterV2");
const RESTAdapaterV2_1 = require("./adapters/RESTAdapaterV2");
const Configuration_1 = require("./Configuration");
const MasterSupervisor_1 = require("./MasterSupervisor");
const GradientState_1 = require("./state/GradientState");
const AdapterSupervisor_1 = require("./supervisors/AdapterSupervisor");
const StateSupervisor_1 = require("./supervisors/StateSupervisor");
const utils_1 = require("./utils");
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
        this.log = utils_1.log.child({ name: "Presenti" });
        this.app = uWebSockets_js_1.App();
        this.supervisor = new MasterSupervisor_1.MasterSupervisor();
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
        const adapterSupervisor = this.adapterSupervisor = new AdapterSupervisor_1.AdapterSupervisor(this.app);
        adapterSupervisor.register(new RemoteAdapterV2_1.RemoteAdatpterV2(this.app));
        adapterSupervisor.register(new RESTAdapaterV2_1.RESTAdapterV2(this.app));
        if (Configuration_1.CONFIG.discord)
            adapterSupervisor.register(new DiscordAdapter_1.DiscordAdapter(Configuration_1.CONFIG.discord));
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
    async dispatchToSelector(selector, refresh = false) {
        const clients = this.clients[selector];
        if (!clients || clients.length === 0)
            return;
        const payload = JSON.stringify(await this.payloadForSelector(selector, false, refresh));
        await Promise.all(clients.map(client => (client.send(payload))));
    }
    async payloadForSelector(selector, newSocket = false, refresh = false) {
        if (!this.scopedPayloads[selector] || refresh)
            this.scopedPayloads[selector] = await this.supervisor.scopedData(selector, newSocket);
        if (!this.globalPayload)
            this.globalPayload = await this.supervisor.globalData(newSocket);
        return Object.assign({}, this.globalPayload, this.scopedPayloads[selector]);
    }
    /**
     * Dispatches to a set of selectors, or all connected users
     * @param selector selectors to dispatch to
     */
    async dispatch(selector, refresh = false) {
        if (!selector)
            selector = Object.keys(this.clients);
        else if (!Array.isArray(selector))
            selector = [selector];
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
exports.PresenceService = PresenceService;
var DiscordAdapter_2 = require("./adapters/DiscordAdapter");
exports.DiscordAdapter = DiscordAdapter_2.DiscordAdapter;
var SpotifyAdapter_1 = require("./adapters/SpotifyAdapter");
exports.SpotifyAdapter = SpotifyAdapter_1.SpotifyAdapter;
