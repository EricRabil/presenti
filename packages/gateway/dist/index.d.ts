import uws from "uWebSockets.js";
import IORedis from "ioredis";
import { DecentralizedPresenceStream } from "@presenti/shared-infrastructure";
import { ObjectCache } from "@presenti/core-cache";
import { PresenceOutput, PresenceProvider } from "@presenti/modules";
import { PresentiAPIClient } from "@presenti/utils";
import { DetachedRemoteWSAPI } from "./services/remote-ws";
export declare class DetachedPresenceGateway implements PresenceProvider {
    app: uws.TemplatedApp;
    log: import("winston").Logger;
    redis: IORedis.Redis;
    redisEvents: IORedis.Redis;
    presences: import("@presenti/core-cache").DistributedArray<import("@presenti/utils").PresenceList>;
    states: ObjectCache<Record<string, any>>;
    presenceStream: DecentralizedPresenceStream;
    remoteWS: DetachedRemoteWSAPI;
    client: PresentiAPIClient;
    constructor();
    /** Called when the process is going to exit. */
    cleaning: boolean;
    cleanup(): void;
    presence(scope: string): Promise<import("@presenti/utils").PresenceList>;
    state(scope: string, initial?: boolean | undefined): Promise<Record<string, any>>;
    subscribe(output: PresenceOutput, events: import("@presenti/modules").SubscribableEvents[]): void;
}
