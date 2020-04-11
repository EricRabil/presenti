"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_1 = require("./adapter");
const RemoteAdapter_1 = require("./adapters/RemoteAdapter");
const RemoteAdapter_2 = require("./adapters/RemoteAdapter");
const ws_1 = __importDefault(require("ws"));
/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
class RemoteClient {
    constructor(options) {
        this.options = options;
        this.ready = false;
        this.adapters = [];
        this._retryCounter = 0;
        this.socket = new ws_1.default(options.url);
    }
    initialize() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === adapter_1.AdapterState.READY)).map(adapter => (adapter.run())));
    }
    run() {
        this.initialize().then(() => this._buildSocket());
    }
    register(adapter) {
        if (this.adapters.includes(adapter)) {
            throw new Error("Cannot register an adapter more than once.");
        }
        this.adapters.push(adapter.on("presence", this.sendLatestPresence.bind(this)));
    }
    sendLatestPresence() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === adapter_1.AdapterState.RUNNING)).map(adapter => (adapter.activity()))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), []))).then(activities => this.presence(activities));
    }
    _buildSocket() {
        this._retryCounter++;
        if (this._retryCounter > 5) {
            throw new Error('Failed to reconnect to the server after five tries.');
        }
        this.socket = new ws_1.default(this.options.url);
        this.socket.onopen = () => {
            this.send({
                type: RemoteAdapter_1.PayloadType.IDENTIFY,
                data: this.options.token
            });
        };
        this.socket.onmessage = ({ data }) => {
            var payload;
            try {
                payload = JSON.parse(data.toString());
            }
            catch (e) {
                console.debug('Failed to parse server payload', {
                    e,
                    data
                });
                return;
            }
            if (!RemoteAdapter_2.isRemotePayload(payload))
                return;
            switch (payload.type) {
                case RemoteAdapter_1.PayloadType.GREETINGS:
                    this.ready = true;
                    this._retryCounter = 0;
                    this.deferredPing();
                    break;
                case RemoteAdapter_1.PayloadType.PONG:
                    this.deferredPing();
                    break;
            }
        };
        this.socket.onclose = () => {
            console.debug('Disconnected from the server, attempting a reconnection in 5000ms');
            setTimeout(() => this._buildSocket());
        };
    }
    /**
     * Pings after 30 seconds
     */
    deferredPing() {
        setTimeout(() => this.ping(), 1000 * 30);
    }
    /**
     * Pings
     */
    ping() {
        return this.send({ type: RemoteAdapter_1.PayloadType.PING });
    }
    /**
     * Sends a presence update packet
     * @param data presence data
     */
    presence(data) {
        return this.send({ type: RemoteAdapter_1.PayloadType.PRESENCE, data });
    }
    /**
     * Sends a packet to the server
     * @param payload data
     */
    send(payload) {
        return new Promise((res, rej) => this.socket.send(JSON.stringify(payload), e => e ? rej(e) : res()));
    }
}
exports.RemoteClient = RemoteClient;
