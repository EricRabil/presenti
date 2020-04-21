"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const remote_presence_utils_2 = require("remote-presence-utils");
/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
class RemoteClient extends remote_presence_utils_1.Evented {
    constructor(options) {
        super();
        this.options = options;
        this.ready = false;
        this.adapters = [];
        this._retryCounter = 0;
        this._killed = false;
        this.socket = new WebSocket(options.url);
    }
    initialize() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.READY)).map(adapter => (adapter.run())));
    }
    /**
     * Starts the RemoteClient
     */
    run() {
        this.initialize().then(() => this._buildSocket());
    }
    /**
     * Registers a PresenceAdapter to the client
     * @param adapter adapter to register
     */
    register(adapter) {
        if (this.adapters.includes(adapter)) {
            throw new Error("Cannot register an adapter more than once.");
        }
        this.adapters.push(adapter.on("presence", this.sendLatestPresence.bind(this)));
    }
    /**
     * Sends the latest presence data to the server
     */
    sendLatestPresence() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.RUNNING)).map(adapter => (adapter.activity()))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), []))).then(activities => this.presence(activities));
    }
    /**
     * Closes the connection
     */
    close() {
        this._killed = true;
        this.socket.close();
    }
    _buildSocket() {
        this._retryCounter++;
        this._killed = false;
        if (this._retryCounter > 5) {
            throw new Error('Failed to reconnect to the server after five tries.');
        }
        this.socket = new WebSocket(this.options.url);
        // authentication on socket open
        this.socket.onopen = () => {
            this.send({
                type: remote_presence_utils_2.PayloadType.IDENTIFY,
                data: this.options.token
            });
        };
        // message handling
        this.socket.onmessage = (data) => {
            data = typeof data === "string" ? data : data.data;
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
            if (!remote_presence_utils_2.isRemotePayload(payload))
                return;
            switch (payload.type) {
                // authentication successful, begin operations
                case remote_presence_utils_2.PayloadType.GREETINGS:
                    this.ready = true;
                    this.emit("ready");
                    this._retryCounter = 0;
                    this.deferredPing();
                    break;
                // on pong, schedule the next ping
                case remote_presence_utils_2.PayloadType.PONG:
                    this.deferredPing();
                    break;
            }
        };
        // run reconnect loop unless we were force-killed or options specify no reconnect
        this.socket.onclose = () => {
            this.emit("close");
            if ((this.options.reconnect === false) || this._killed)
                return;
            console.log('Disconnected from the server, attempting a reconnection in 5000ms');
            setTimeout(() => this._buildSocket(), 5000);
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
        return this.send({ type: remote_presence_utils_2.PayloadType.PING });
    }
    /**
     * Sends a presence update packet
     * @param data presence data
     */
    presence(data) {
        this.emit("presence", data);
        return this.send({ type: remote_presence_utils_2.PayloadType.PRESENCE, data });
    }
    /**
     * Sends a packet to the server
     * @param payload data
     */
    send(payload) {
        this.socket.send(JSON.stringify(payload));
    }
}
exports.RemoteClient = RemoteClient;
