import Sactivity, { SpotifyClient } from "sactivity";
import { PresenceAdapter, AdapterState } from "../adapter";
import { Activity } from "discord.js";
/**
 * Presence binding for sactivity
 */
export declare class SpotifyAdapter extends PresenceAdapter {
    readonly cookies: string;
    activitySupervisor: Sactivity;
    client: SpotifyClient;
    state: AdapterState;
    static readonly NAME = "Spotify";
    constructor(cookies: string);
    run(): Promise<void>;
    palettes: Record<string, string[]>;
    palette(): Promise<string[]>;
    activity(): Promise<Partial<Activity> | undefined>;
    get start(): number;
    get end(): number;
    get playing(): boolean;
    get imageURL(): string | undefined;
    get artistName(): string;
    get track(): {
        atrist_uri: string;
        is_explicit: "true" | "false";
        is_local: "true" | "false";
        album_disc_number: string;
        title: string;
        album_disc_count: string;
        album_artist_name: string;
        duration: string;
        ['collection.in_collection']: string;
        album_track_number: string;
        image_xlarge_url: string;
        popularity: string;
        iteration: string;
        ['collection.can_add']: string;
        has_lyrics: "true" | "false";
        artist_name: string;
        image_large_url: string;
        available_file_formats: string;
        context_uri: string;
        player: string;
        album_title: string;
        album_uri: string;
        album_track_count: string;
        image_small_url: string;
        image_url: string;
        entity_uri: string;
    };
    get trackUID(): string;
    get trackName(): string;
    get albumName(): string;
    rebuild(): Promise<void>;
    rebuildActivitySupervisor(): void;
    _lastTimestamp: string;
    dispatch(): Promise<void>;
    _reconnectCounter: number;
    rebuildSpotifyClient(): Promise<void>;
}
