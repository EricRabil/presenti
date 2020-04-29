"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const remote_presence_utils_1 = require("remote-presence-utils");
const uWebSockets_js_1 = require("uWebSockets.js");
const socket_adapter_1 = require("./adapters/presence/socket-adapter");
const rest_adapter_1 = require("./adapters/presence/rest-adapter");
const master_supervisor_1 = require("./supervisors/master-supervisor");
const gradient_state_1 = require("./adapters/state/gradient-state");
const adapter_supervisor_1 = require("./supervisors/adapter-supervisor");
const state_supervisor_1 = require("./supervisors/state-supervisor");
const logging_1 = require("./utils/logging");
/**
 * Tracks global and scoped (per-user presence)
 */
class PresenceService {
    constructor(port, userQuery) {
        this.port = port;
        this.userQuery = userQuery;
        /** Supervisor that tracks supervisors */
        this.supervisor = new master_supervisor_1.MasterSupervisor();
        /** Record of <scope, connections> */
        this.clients = {};
        /** Record of <connection, scope> */
        this.idMap = new Map();
        /** Record of <scope, latest payload> */
        this.scopedPayloads = {};
        /** Record of latest global payload */
        this.globalPayload = {};
        /** logging instance */
        this.log = logging_1.log.child({ name: "Presenti" });
        this.app = uWebSockets_js_1.App();
        this.supervisor = new master_supervisor_1.MasterSupervisor();
        this.supervisor.on("updated", (scope) => this.dispatch(scope, true));
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
        const adapterSupervisor = this.adapterSupervisor = new adapter_supervisor_1.AdapterSupervisor();
        adapterSupervisor.register(new socket_adapter_1.RemoteAdatpterV2(this.app));
        adapterSupervisor.register(new rest_adapter_1.RESTAdapterV2(this.app));
        this.supervisor.register(adapterSupervisor);
    }
    /** Registers state adapters with the supervisor */
    registerStates() {
        const stateSupervisor = new state_supervisor_1.StateSupervisor();
        stateSupervisor.register(new gradient_state_1.GradientState());
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
    /**
     * Returns the latest payload for a scope, querying adapters if none has been cached already
     * @param scope
     * @param newSocket is this payload being sent for a new connection?
     * @param refresh should the cache be refreshed?
     */
    async payloadForSelector(scope, newSocket = false, refresh = false) {
        if (!this.scopedPayloads[scope] || refresh)
            this.scopedPayloads[scope] = await this.supervisor.scopedData(scope, newSocket);
        if (!this.globalPayload)
            this.globalPayload = await this.supervisor.globalData(newSocket);
        return Object.assign({}, this.globalPayload, this.scopedPayloads[scope]);
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
__export(require("./adapters/presence/rest-adapter"));
__export(require("./adapters/presence/socket-adapter"));
__export(require("./adapters/state/gradient-state"));
__export(require("./supervisors/adapter-supervisor"));
__export(require("./supervisors/state-supervisor"));
__export(require("./supervisors/master-supervisor"));
__export(require("./structs/adapter"));
__export(require("./structs/rest-api-base"));
__export(require("./structs/scoped-adapter"));
__export(require("./structs/socket-api-base"));
__export(require("./structs/state"));
__export(require("./structs/supervisor"));
__export(require("./utils"));
__export(require("./web"));
