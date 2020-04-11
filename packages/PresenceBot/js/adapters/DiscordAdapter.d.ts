import { PresenceAdapter, AdapterState } from "../adapter";
import { Client, Activity } from "discord.js";
export interface DiscordAdapterOptions {
    token: string;
    user: string;
    overrides: string[];
}
export declare class DiscordAdapter extends PresenceAdapter {
    readonly options: DiscordAdapterOptions;
    client: Client;
    constructor(options: DiscordAdapterOptions);
    state: AdapterState;
    run(): Promise<void>;
    get user(): import("discord.js").User | null;
    activity(): Promise<Activity[] | undefined>;
}
