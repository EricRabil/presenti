import uws from "uWebSockets.js";
import IORedis from "ioredis";
import log from "@presenti/logging";
import { DecentralizedPresenceStream } from "@presenti/shared-infrastructure";
import { PresenceCacheBuilder, StateCacheBuilder, ObjectCache } from "@presenti/core-cache";
import { PresenceOutput, PresenceProvider } from "@presenti/modules";
import { PresentiAPIClient } from "@presenti/utils";
import { DetachedRemoteWSAPI } from "./services/remote-ws";

const port = +process.env.PRESENTI_GATEWAY_PORT! || 9283;
const redisConfig = {
    port: +process.env.REDIS_PORT! || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1'
};

export class DetachedPresenceGateway implements PresenceProvider {
    app = uws.App();
    log = log.child({ name: "DetachedPresenceGateway" });
    redis = new IORedis(redisConfig);
    redisEvents = new IORedis(redisConfig);

    presences = PresenceCacheBuilder(this.redis, this.redisEvents);
    states = StateCacheBuilder(this.redis, this.redisEvents);

    presenceStream: DecentralizedPresenceStream;
    remoteWS: DetachedRemoteWSAPI;

    client: PresentiAPIClient;

    constructor() {
        this.presenceStream = new DecentralizedPresenceStream(this, this.app);
        this.remoteWS = new DetachedRemoteWSAPI(this, this.app);
        this.redisEvents.on("message", (channel, message) => ObjectCache.receiveEvent(channel, message, [this.presences, this.states]));

        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((ev: any) => process.on(ev, () => this.cleanup()));

        this.app.listen('0.0.0.0', port, () => {
            this.log.info(`Server is running at :${port} and is ready for connections.`);
        });
    }

    /** Called when the process is going to exit. */
    cleaning = false;
    cleanup() {
        if (this.cleaning) return;
        this.cleaning = true;

        this.log.info('Cleaning up...');

        this.presences.beforeExit().then(() => {
            this.log.info('Thank you, and goodnight.');

            process.exit(0);
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
}