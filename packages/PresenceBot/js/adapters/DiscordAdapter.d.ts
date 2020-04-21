import { PresenceAdapter, AdapterState, PresenceStruct } from "remote-presence-utils";
import { Client } from "discord.js";
export interface DiscordAdapterOptions {
    token: string;
    user: string;
    overrides: string[];
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
export declare class DiscordAdapter extends PresenceAdapter {
    readonly options: DiscordAdapterOptions;
    client: Client;
    iconRegistry: Record<string, DiscordIconMap>;
    constructor(options: DiscordAdapterOptions);
    state: AdapterState;
    run(): Promise<void>;
    get user(): import("discord.js").User | null;
    activity(): Promise<PresenceStruct[]>;
}
export {};
