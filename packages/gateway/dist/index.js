"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = __importDefault(require("uWebSockets.js"));
const ioredis_1 = __importDefault(require("ioredis"));
const logging_1 = __importDefault(require("@presenti/logging"));
const shared_infrastructure_1 = require("@presenti/shared-infrastructure");
const core_cache_1 = require("@presenti/core-cache");
const remote_ws_1 = require("./services/remote-ws");
const port = +process.env.PRESENTI_GATEWAY_PORT || 9283;
const redisConfig = {
    port: +process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1'
};
class DetachedPresenceGateway {
    constructor() {
        this.app = uWebSockets_js_1.default.App();
        this.log = logging_1.default.child({ name: "DetachedPresenceGateway" });
        this.redis = new ioredis_1.default(redisConfig);
        this.redisEvents = new ioredis_1.default(redisConfig);
        this.presences = core_cache_1.PresenceCacheBuilder(this.redis, this.redisEvents);
        this.states = core_cache_1.StateCacheBuilder(this.redis, this.redisEvents);
        /** Called when the process is going to exit. */
        this.cleaning = false;
        this.presenceStream = new shared_infrastructure_1.DecentralizedPresenceStream(this, this.app);
        this.remoteWS = new remote_ws_1.DetachedRemoteWSAPI(this, this.app);
        this.redisEvents.on("message", (channel, message) => core_cache_1.ObjectCache.receiveEvent(channel, message, [this.presences, this.states]));
        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((ev) => process.on(ev, () => this.cleanup()));
        this.app.listen('0.0.0.0', port, () => {
            this.log.info(`Server is running at :${port} and is ready for connections.`);
        });
    }
    cleanup() {
        if (this.cleaning)
            return;
        this.cleaning = true;
        this.log.info('Cleaning up...');
        this.presences.beforeExit().then(() => {
            this.log.info('Thank you, and goodnight.');
            process.exit(0);
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
