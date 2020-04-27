import { AdapterState } from "remote-presence-utils";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { Activity } from "discord.js";
import { ScopedPresenceAdapter } from "../structs/scoped-adapter";
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
     * Returns presence packets for a specific user
     * @param id id to query
     */
    activityForUser(id: string): Promise<any>;
    activities(): Promise<{}>;
}
