"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const remote_presence_utils_2 = require("remote-presence-utils");
const uuid = __importStar(require("uuid"));
const scoped_adapter_1 = require("../structs/scoped-adapter");
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
        this.state = remote_presence_utils_1.AdapterState.READY;
        app.ws('/remote', {
            open: (ws, req) => {
                const id = uuid.v4();
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
                if (!remote_presence_utils_2.isRemotePayload(parsed))
                    return;
                switch (parsed.type) {
                    case remote_presence_utils_2.PayloadType.PING:
                        // pong!
                        ws.send(JSON.stringify({ type: remote_presence_utils_2.PayloadType.PONG }));
                        break;
                    case remote_presence_utils_2.PayloadType.PRESENCE:
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
                        this.emit("updated", authenticated);
                        break;
                    case remote_presence_utils_2.PayloadType.IDENTIFY:
                        // close if already authenticated >:(
                        if (authenticated) {
                            ws.close();
                            break;
                        }
                        const token = parsed.data;
                        const user = await this.validate(token);
                        // close if we couldnt validate the token
                        if (!user) {
                            ws.close();
                            break;
                        }
                        // welcome to the club, baby
                        this.authTable[id] = user;
                        this.presences[id] = [];
                        ws.send(JSON.stringify({ type: remote_presence_utils_2.PayloadType.GREETINGS }));
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
                this.emit("updated", authenticated);
            }
        });
    }
    async run() {
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    /**
     * Returns presence packets for a specific user
     * @param id id to query
     */
    async activityForUser(id) {
        const socketIDs = Object.entries(this.authTable).filter(([socket, user]) => user === id).map(([socket]) => socket);
        const presences = socketIDs.map(socket => this.presences[socket]);
        return presences.map(list => list.filter(presence => !!presence)).reduce((a, c) => a.concat(c), []);
    }
    async activities() {
        return {};
    }
}
exports.RemoteAdapter = RemoteAdapter;
