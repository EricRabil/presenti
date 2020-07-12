"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const uWebSockets_js_1 = __importDefault(require("uWebSockets.js"));
const presence_stream_1 = require("@presenti/server/dist/outputs/presence-stream");
const core_cache_1 = require("@presenti/core-cache");
const utils_1 = require("@presenti/utils");
const logging_1 = __importDefault(require("@presenti/logging"));
const port = +process.env.PRESENTI_GATEWAY_PORT || 9283;
const redisConfig = {
    port: +process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1'
};
class DetachedPresenceStreamOutput extends presence_stream_1.PresenceStreamOutput {
    constructor() {
        super(...arguments);
        this.listeners = {};
    }
    connected(scope) {
        if (this.listeners[scope])
            return;
        const { presence, state } = this.listeners[scope] = {
            presence: presence => this.broadcastPresence(scope, presence),
            state: state => this.broadcastState(scope, state)
        };
        this.provider.presences.subscribe(scope, presence);
        this.provider.states.subscribe(scope, state);
    }
    disconnected(scope) {
        if (this.clients[scope] && this.clients[scope].length > 0)
            return;
        if (!this.listeners[scope])
            return;
        const { presence, state } = this.listeners[scope];
        this.listeners[scope] = undefined;
        this.provider.presences.unsubscribe(scope, presence);
        this.provider.states.unsubscribe(scope, state);
    }
    async broadcastPresence(scope, presence) {
        return this.broadcast(scope, JSON.stringify({
            type: utils_1.PayloadType.PRESENCE,
            data: {
                presence: "%presence%"
            }
        }).replace('"%presence%"', presence));
    }
    broadcastState(scope, state) {
        return this.broadcast(scope, JSON.stringify({
            type: utils_1.PayloadType.STATE,
            data: {
                state: "%state%"
            }
        }).replace('"%state%"', state));
    }
}
class DetachedPresenceGateway {
    constructor() {
        this.redis = new ioredis_1.default(redisConfig);
        this.redisEvents = new ioredis_1.default(redisConfig);
        this.app = uWebSockets_js_1.default.App();
        this.presences = core_cache_1.PresenceCacheBuilder(this.redis, this.redisEvents);
        this.states = core_cache_1.StateCacheBuilder(this.redis, this.redisEvents);
        this.stream = new DetachedPresenceStreamOutput(this, this.app);
        this.log = logging_1.default.child({ name: "Gateway" });
        this.redisEvents.on("message", (channel, message) => core_cache_1.ObjectCache.receiveEvent(channel, message, [this.presences, this.states]));
        this.app.listen('0.0.0.0', port, () => {
            this.log.info("Gateway is running and ready for connections.");
        });
    }
    async presence(scope) {
        return await this.presences.get(scope) || [];
    }
    async state(scope, initial) {
        return await this.states.get(scope) || {};
    }
    subscribe(output, events) {
        return;
    }
}
exports.DetachedPresenceGateway = DetachedPresenceGateway;
