import { Presence, AdapterState } from "../adapter";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { Activity } from "discord.js";
import { ScopedPresenceAdapter } from "../scoped-adapter";
export interface RemoteAdapterOptions {
}
export interface RemotePayload {
    type: PayloadType;
    data?: any;
}
export interface RemotePresencePayload {
    type: PayloadType.PRESENCE;
    data: Presence[];
}
export declare enum PayloadType {
    PING = 0,
    PONG = 1,
    PRESENCE = 2,
    IDENTIFY = 3,
    GREETINGS = 4
}
export declare function isRemotePayload(payload: any): payload is RemotePayload;
export interface PresenceUpdateEvent {
    $selector: string;
}
export declare class RemoteAdapter extends ScopedPresenceAdapter {
    private validate;
    clients: Record<string, WebSocket>;
    ids: Map<WebSocket, string>;
    /**
     * Map of [connectionID, userID]
     */
    authTable: Record<string, string | null>;
    presences: Record<string, Array<Partial<Activity> | undefined>>;
    constructor(app: TemplatedApp, validate: (token: string) => Promise<string | null>);
    state: AdapterState;
    run(): Promise<void>;
    /**
     * Returns all presence packets
     */
    activity(): Promise<import("../adapter").Presence>;
    /**
     * Returns presence packets for a specific user
     * @param id id to query
     */
    activityForUser(id: string): Promise<any>;
}
