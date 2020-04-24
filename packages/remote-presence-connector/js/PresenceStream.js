"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
class PresenceStream extends remote_presence_utils_1.Evented {
    constructor(scope, options = {}) {
        super();
        this.scope = scope;
        this.options = options;
        this.socket = null;
        this._killed = false;
        if (!options.url)
            options.url = PresenceStream.DEFAULT_URL;
        if (typeof options.reconnectInterval !== "number")
            options.reconnectInterval = PresenceStream.DEFAULT_RECONNECT;
    }
    close() {
        if (!this.socket || this.socket.readyState === WebSocket.CLOSED)
            return;
        this._killed = true;
        this.socket.close();
    }
    connect() {
        if (this.socket)
            this.close();
        this._killed = false;
        this.socket = new WebSocket(this.url);
        this.socket.onmessage = ({ data }) => {
            const payload = JSON.parse(data);
            switch (payload.type) {
                case remote_presence_utils_1.PayloadType.PONG:
                    setTimeout(() => this.ping(), 30 * 1000);
                    break;
                default:
                    const { presences, state } = JSON.parse(data);
                    this.emit("presence", presences);
                    this.emit("state", state);
            }
        };
        this.socket.onclose = () => {
            if (this._killed)
                return;
            if (this.options.reconnectInterval === 0)
                return;
            console.debug(`Socket disconnected from the server. Reconnecting in ${this.options.reconnectInterval}ms`);
            setTimeout(() => this.connect(), this.options.reconnectInterval);
        };
        this.socket.onopen = () => (console.log('Connected to the Presenti API'), this.ping());
    }
    ping() {
        var _a;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: remote_presence_utils_1.PayloadType.PING }));
    }
    get url() {
        return `${this.options.url}${this.scope}`;
    }
}
exports.PresenceStream = PresenceStream;
PresenceStream.DEFAULT_URL = "wss://api.ericrabil.com/presence/";
PresenceStream.DEFAULT_RECONNECT = 5000;
