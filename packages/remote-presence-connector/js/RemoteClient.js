"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const remote_presence_utils_2 = require("remote-presence-utils");
const winston_1 = __importDefault(require("winston"));
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
        this.options.reconnectInterval = options.reconnectInterval || 5000;
        this.log = winston_1.default.createLogger({
            levels: {
                emerg: 0,
                alert: 1,
                crit: 2,
                error: 3,
                warn: 4,
                notice: 5,
                info: 6,
                debug: 7
            },
            transports: options.logging ? [
                new winston_1.default.transports.Console({
                    level: "debug",
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                })
            ] : []
        });
    }
    initialize() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.READY)).map(adapter => (adapter.run())));
    }
    /**
     * Starts the RemoteClient
     */
    async run() {
        await this.initialize();
        return this._buildSocket();
    }
    /**
     * Registers a PresenceAdapter to the client
     * @param adapter adapter to register
     */
    register(adapter) {
        if (this.adapters.includes(adapter)) {
            throw new Error("Cannot register an adapter more than once.");
        }
        this.adapters.push(adapter.on("updated", this.sendLatestPresence.bind(this)));
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
        this.ready = false;
        if (this.options.reconnect && this._retryCounter > this.options.reconnectGiveUp) {
            this.log.error(`Failed to reconnect to the server after ${this.options.reconnectGiveUp} tries.`);
            return;
        }
        this.socket = new WebSocket(`ws${this.options.host}/remote`);
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
                this.log.debug('Failed to parse server payload', {
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
                    this.log.info('Connected to the server.');
                    break;
                // on pong, schedule the next ping
                case remote_presence_utils_2.PayloadType.PONG:
                    this.deferredPing();
                    break;
            }
        };
        let dealtWith = false;
        this.socket.onerror = e => {
            var _a, _b;
            this.log.error(`Socket errored! ${(_a = e.error) === null || _a === void 0 ? void 0 : _a.code}`, ((_b = e.error) === null || _b === void 0 ? void 0 : _b.code) ? '' : e);
            if (!dealtWith) {
                dealtWith = true;
                this.terminationHandler();
            }
        };
        // run reconnect loop unless we were force-killed or options specify no reconnect
        this.socket.onclose = () => {
            this.emit("close");
            if (dealtWith)
                return;
            dealtWith = true;
            if ((this.options.reconnect === false) || this._killed)
                return;
            this.log.warn(`Disconnected from the server, attempting a reconnection in ${this.options.reconnectInterval}ms`);
            setTimeout(() => this._buildSocket(), this.options.reconnectInterval);
        };
    }
    terminationHandler() {
        this.log.warn(`Disconnected from the server, attempting a reconnection in ${this.options.reconnectInterval}ms`);
        setTimeout(() => this._buildSocket(), this.options.reconnectInterval);
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
    presence(data = []) {
        this.emit("presence", data);
        return this.send({ type: remote_presence_utils_2.PayloadType.PRESENCE, data });
    }
    /**
     * Updates the presence for a given scope. Requires first-party token.
     * Calling this endpoint without a first-party token will terminate the connection.
     * @param data presence update dto
     */
    updatePresenceForScope(data) {
        return this.send({ type: remote_presence_utils_2.PayloadType.PRESENCE_FIRST_PARTY, data });
    }
    /**
     * Validates a link code for a user. Requires first-party token.
     * @param scope scope to verify
     * @param code code to test
     */
    async validateCode(scope, code) {
        try {
            const r = await fetch(`${this.ajaxBase}${remote_presence_utils_2.API_ROUTES.LINK_CODE}`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'authorization': this.options.token
                },
                body: JSON.stringify({
                    scope,
                    code
                })
            }).then(res => res.json());
            console.log(r);
            return !!r.valid;
        }
        catch (e) {
            return false;
        }
    }
    get socketEndpoint() {
        return `ws${this.options.host}/remote`;
    }
    get ajaxBase() {
        return `http${this.options.host}`;
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
