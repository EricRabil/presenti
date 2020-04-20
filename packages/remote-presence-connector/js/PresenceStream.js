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
        this.socket = new WebSocket(this.url);
        this.socket.onmessage = ({ data }) => {
            const { activities } = JSON.parse(data);
            this.emit("presence", activities);
        };
        this.socket.onclose = () => {
            if (this._killed)
                return;
            if (this.options.reconnectInterval === 0)
                return;
            console.debug(`Socket disconnected from the server. Reconnecting in ${this.options.reconnectInterval}ms`);
            setTimeout(() => this.connect(), this.options.reconnectInterval);
        };
    }
    get url() {
        return `${this.options.url}${this.scope}`;
    }
}
exports.PresenceStream = PresenceStream;
PresenceStream.DEFAULT_URL = "wss://api.ericrabil.com/presence/";
PresenceStream.DEFAULT_RECONNECT = 5000;
