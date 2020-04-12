import Sactivity, { SpotifyClient } from "sactivity";
import { PresenceAdapter, AdapterState } from "remote-presence-utils";
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
    activity(): Promise<{
        [x: number]: string | {
            palette: string[];
            artists: {
                name: string;
                link: string;
            }[];
            albumLink: string;
            songLink: string;
            artwork: string | undefined;
        };
        name: string;
        type: "LISTENING";
        assets: any;
        state: null;
        details: string;
        timestamps: {
            start: string;
            end: string;
        };
    } | undefined>;
    get start(): number;
    get end(): number;
    get playing(): boolean;
    get imageURL(): string | undefined;
    get artists(): {
        name: string;
        link: string;
    }[];
    get track(): import("sactivity/js/types").SpotifyTrack;
    get trackUID(): string;
    get trackName(): string;
    get albumName(): string;
    get songLink(): string;
    get albumLink(): string;
    rebuild(): Promise<void>;
    rebuildActivitySupervisor(): void;
    _lastTimestamp: string;
    dispatch(): Promise<void>;
    _reconnectCounter: number;
    rebuildSpotifyClient(): Promise<void>;
}
