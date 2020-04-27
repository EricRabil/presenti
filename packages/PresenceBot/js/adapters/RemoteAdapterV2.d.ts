import { Presence, FirstPartyPresenceData } from "remote-presence-utils";
import { TemplatedApp } from "uWebSockets.js";
import { SocketAPIAdapter, SocketContext } from "../structs/socket-api-adapter";
import { PresenceDictionary } from "../utils/presence-magic";
export declare class RemoteAdatpterV2 extends SocketAPIAdapter {
    log: import("winston").Logger;
    constructor(app: TemplatedApp);
    /** Format of Record<socketID, Record<scope, PresenceList>> */
    firstPartyPresenceLedger: Record<string, PresenceDictionary>;
    /** Format of Record<socketID, Record<scope, PresenceList>> */
    thirdPartyPresenceLedger: Record<string, PresenceDictionary>;
    /** Object that merges all third-party presences into the format of Record<scope, PresenceList> */
    thirdPartyPresences: PresenceDictionary;
    /** Object that merges all first-party presences into the format of Record<scope, PresenceList> */
    firstPartyPresences: PresenceDictionary;
    run(): void;
    presenceHandler(ws: SocketContext, data: Presence): void;
    firstPartyPresenceHandler(ws: SocketContext, { scope, presence }: FirstPartyPresenceData): void;
    /**
     * Called when the socket is closed. Tears down the presence ledger for that socket.
     * @param ctx socket context, or { id: string } if the context is already gone.
     */
    closed(id: string): void;
    /**
     * Generates a presence table for connected websockets
     * @param ws socket context
     * @param data identification data
     */
    identificationHandler(ws: SocketContext, data: any): Promise<boolean>;
    /**
     * Returns a list of presences for a scope
     * @param scope scope
     */
    activityForUser(scope: string): Partial<import("remote-presence-utils").PresenceStruct>[];
    activities(): Promise<{}>;
    /**
     * Creates a presence proxy that maps events to this adapter
     */
    private createPresenceTable;
}
