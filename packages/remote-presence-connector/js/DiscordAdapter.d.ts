import { AdapterState, PresenceStruct } from "remote-presence-utils";
import { Client } from "discord.js";
import { StorageAdapter } from "./internal/StorageAdapter";
export interface DiscordAdapterOptions {
    token: string;
    prefix: string;
}
interface Tagged {
    id: string;
    name: string;
}
interface DiscordIconMap {
    id: string;
    name: string;
    icon: string;
    splash: string;
    overlay: boolean;
    overlayWarn: boolean;
    overlayCompatibilityHook: boolean;
    aliases: string[];
    publishers: Tagged[];
    developers: Tagged[];
    guildId: string | null;
    thirdPartySkus: Array<{
        distributor: string;
        id: string;
        sku: string;
    }>;
    executables: Array<{
        name: string;
        os: string;
    }>;
    hashes: any[];
    description: string;
    youtubeTrailerVideoId: string | null;
    eulaId: string | null;
    slug: string | null;
}
interface DiscordStorage {
    scopeBindings: {
        [scope: string]: string;
    };
}
/**
 * This cannot be piped remotely.
 */
export declare class DiscordAdapter extends StorageAdapter<DiscordStorage> {
    readonly options: DiscordAdapterOptions;
    client: Client;
    iconRegistry: Record<string, DiscordIconMap>;
    log: any;
    linkLocks: Record<string, ReturnType<typeof setTimeout>>;
    linkLockWarns: Record<string, boolean | undefined>;
    constructor(options: DiscordAdapterOptions);
    state: AdapterState;
    run(): Promise<void>;
    deferLinkLock(id: string): void;
    discordPresences(scope: string): Promise<any>;
    userExcludes(scope: string): Promise<any>;
    activityForUser(scope: string): Promise<PresenceStruct[]>;
    private convertActivities;
    /**
     * Returns all activities, useful for service initialization
     */
    activities(): Promise<any>;
}
export {};
