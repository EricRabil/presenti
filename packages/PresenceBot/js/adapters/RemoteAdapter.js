"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_1 = require("../adapter");
const node_uuid_1 = __importDefault(require("node-uuid"));
const scoped_adapter_1 = require("../scoped-adapter");
var PayloadType;
(function (PayloadType) {
    PayloadType[PayloadType["PING"] = 0] = "PING";
    PayloadType[PayloadType["PONG"] = 1] = "PONG";
    PayloadType[PayloadType["PRESENCE"] = 2] = "PRESENCE";
    PayloadType[PayloadType["IDENTIFY"] = 3] = "IDENTIFY";
    PayloadType[PayloadType["GREETINGS"] = 4] = "GREETINGS";
})(PayloadType = exports.PayloadType || (exports.PayloadType = {}));
function isRemotePayload(payload) {
    return "type" in payload;
}
exports.isRemotePayload = isRemotePayload;
class RemoteAdapter extends scoped_adapter_1.ScopedPresenceAdapter {
    constructor(app, validate) {
        super();
        this.validate = validate;
        this.clients = {};
        this.ids = new Map();
        /**
         * Map of [connectionID, userID]
         */
        this.authTable = {};
        this.presences = {};
        this.state = adapter_1.AdapterState.READY;
        app.ws('/remote', {
            open: (ws, req) => {
                const id = node_uuid_1.default.v4();
                // set a two-way map for the clients and their IDs
                this.clients[id] = ws;
                this.ids.set(ws, id);
                // set a null state for the connection ID
                this.authTable[id] = null;
            },
            message: async (ws, message) => {
                const id = this.ids.get(ws);
                if (!id)
                    return;
                const { [id]: authenticated } = this.authTable;
                const rawStr = Buffer.from(message).toString('utf8');
                var parsed;
                try {
                    parsed = JSON.parse(rawStr);
                }
                catch (e) {
                    console.log({
                        e,
                        rawStr,
                        message
                    });
                    // close on malformed payload
                    ws.close();
                    return;
                }
                if (!isRemotePayload(parsed))
                    return;
                switch (parsed.type) {
                    case PayloadType.PING:
                        // pong!
                        ws.send(JSON.stringify({ type: PayloadType.PONG }));
                        break;
                    case PayloadType.PRESENCE:
                        // close if not authenticated >:(
                        if (!authenticated) {
                            ws.close();
                            break;
                        }
                        if (!parsed.data)
                            break;
                        if (!Array.isArray(parsed.data))
                            parsed.data = [parsed.data];
                        this.presences[id] = parsed.data;
                        this.emit("presence", authenticated);
                        break;
                    case PayloadType.IDENTIFY:
                        // close if already authenticated >:(
                        if (authenticated) {
                            console.log('fuck');
                            ws.close();
                            break;
                        }
                        const token = parsed.data;
                        const user = await this.validate(token);
                        // close if we couldnt validate the token
                        if (!user) {
                            console.log('die');
                            ws.close();
                            break;
                        }
                        // welcome to the club, baby
                        this.authTable[id] = user;
                        this.presences[id] = [];
                        ws.send(JSON.stringify({ type: PayloadType.GREETINGS }));
                        break;
                }
            },
            close: (ws, code, message) => {
                const id = this.ids.get(ws);
                if (!id)
                    return;
                const { [id]: authenticated } = this.authTable;
                delete this.authTable[id];
                delete this.clients[id];
                delete this.presences[id];
                this.ids.delete(ws);
                this.emit("presence", authenticated);
            }
        });
    }
    async run() {
        this.state = adapter_1.AdapterState.RUNNING;
    }
    /**
     * Returns all presence packets
     */
    async activity() {
        return Object.values(this.presences).filter(p => (!!p && Array.isArray(p))).reduce((a, c) => (a.concat(c)), []).filter(a => !!a);
    }
    /**
     * Returns presence packets for a specific user
     * @param id id to query
     */
    async activityForUser(id) {
        const socketIDs = Object.entries(this.authTable).filter(([socket, user]) => user === id).map(([socket]) => socket);
        const presences = socketIDs.map(socket => this.presences[socket]);
        return presences.map(list => list.filter(presence => !!presence)).reduce((a, c) => a.concat(c));
    }
}
exports.RemoteAdapter = RemoteAdapter;
