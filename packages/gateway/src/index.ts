import Redis from "ioredis";
import uws from "uWebSockets.js";
import { PresenceStreamOutput } from "@presenti/server/dist/outputs/presence-stream";
import { ObjectCache, PresenceCacheBuilder, StateCacheBuilder } from "@presenti/core-cache";
import { PresenceProvider, PresenceOutput } from "@presenti/modules";
import { PresentiAPIClient, PresenceList, PayloadType, RemotePresencePayload } from "@presenti/utils";
import log from "@presenti/logging";

const port = +process.env.PRESENTI_GATEWAY_PORT! || 9283;
const redisConfig = {
    port: +process.env.REDIS_PORT! || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1'
};

class DetachedPresenceStreamOutput extends PresenceStreamOutput {
    provider: DetachedPresenceGateway;

    listeners: Record<string, { presence: (presence: string) => any, state: (state: string) => any }> = {};

    connected(scope: string) {
        if (this.listeners[scope]) return;
        
        const { presence, state } = this.listeners[scope] = {
            presence: presence => this.broadcastPresence(scope, presence),
            state: state => this.broadcastState(scope, state)
        }

        this.provider.presences.subscribe(scope, presence);
        this.provider.states.subscribe(scope, state);
    }

    disconnected(scope: string) {
        if (this.clients[scope] && this.clients[scope].length > 0) return;
        if (!this.listeners[scope]) return;

        const { presence, state } = this.listeners[scope];
        this.listeners[scope] = undefined!;

        this.provider.presences.unsubscribe(scope, presence);
        this.provider.states.unsubscribe(scope, state);
    }

    async broadcastPresence(scope: string, presence: string) {
        return this.broadcast(scope, JSON.stringify({
            type: PayloadType.PRESENCE,
            data: {
                presence: "%presence%"
            }
        }).replace('"%presence%"', presence));
    }

    broadcastState(scope: string, state: string) {
        return this.broadcast(scope, JSON.stringify({
            type: PayloadType.STATE,
            data: {
                state: "%state%"
            }
        }).replace('"%state%"', state));
    }
}

export class DetachedPresenceGateway implements PresenceProvider {
    redis = new Redis(redisConfig);
    redisEvents = new Redis(redisConfig);
    app = uws.App();

    presences = PresenceCacheBuilder(this.redis, this.redisEvents);
    states = StateCacheBuilder(this.redis, this.redisEvents);

    stream = new DetachedPresenceStreamOutput(this, this.app);

    log = log.child({ name: "Gateway" });

    constructor() {
        this.redisEvents.on("message", (channel, message) => ObjectCache.receiveEvent(channel, message, [this.presences, this.states]));

        this.app.listen('0.0.0.0', port, () => {
            this.log.info("Gateway is running and ready for connections.");
        });
    }

    async presence(scope: string): Promise<import("@presenti/utils").PresenceList> {
        return await this.presences.get(scope) || [];
    }

    async state(scope: string, initial?: boolean | undefined): Promise<Record<string, any>> {
        return await this.states.get(scope) || {};
    }

    subscribe(output: PresenceOutput, events: import("@presenti/modules").SubscribableEvents[]): void {
        return;
    }

    client: PresentiAPIClient;
}