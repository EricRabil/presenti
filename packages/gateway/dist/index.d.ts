import Redis from "ioredis";
import uws from "uWebSockets.js";
import { PresenceStreamOutput } from "@presenti/server/dist/outputs/presence-stream";
import { ObjectCache } from "@presenti/core-cache";
import { PresenceProvider, PresenceOutput } from "@presenti/modules";
import { PresentiAPIClient, PresenceList } from "@presenti/utils";
declare class DetachedPresenceStreamOutput extends PresenceStreamOutput {
    provider: DetachedPresenceGateway;
    listeners: Record<string, {
        presence: (presence: string) => any;
        state: (state: string) => any;
    }>;
    connected(scope: string): void;
    disconnected(scope: string): void;
    broadcastPresence(scope: string, presence: string): Promise<boolean[] | undefined>;
    broadcastState(scope: string, state: string): Promise<boolean[]> | undefined;
}
export declare class DetachedPresenceGateway implements PresenceProvider {
    redis: Redis.Redis;
    redisEvents: Redis.Redis;
    app: uws.TemplatedApp;
    presences: import("@presenti/core-cache").DistributedArray<PresenceList>;
    states: ObjectCache<Record<string, any>>;
    stream: DetachedPresenceStreamOutput;
    log: import("winston").Logger;
    constructor();
    presence(scope: string): Promise<import("@presenti/utils").PresenceList>;
    state(scope: string, initial?: boolean | undefined): Promise<Record<string, any>>;
    subscribe(output: PresenceOutput, events: import("@presenti/modules").SubscribableEvents[]): void;
    client: PresentiAPIClient;
}
export {};
