import RestAPIBase from "../../structs/rest-api-base";
import { PBRequest, PBResponse, RequestHandler } from "../../utils/web/types";
import { ScopedPresenceAdapter } from "../../structs/scoped-adapter";
import { TemplatedApp } from "uWebSockets.js";
import { PresenceList, PresenceDictionary } from "../../utils/presence-magic";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import { User } from "../../database/entities";
import { RouteData } from "../../utils/web/utils";
export declare class RESTPresenceAPI extends RestAPIBase {
    private adapter;
    log: import("winston").Logger;
    constructor(app: TemplatedApp, adapter: RESTAdapterV2);
    buildStack(metadata: RouteData, middleware: RequestHandler[], headers?: string[]): (res: import("uWebSockets.js").HttpResponse, req: import("uWebSockets.js").HttpRequest) => any;
    createSession(req: PBRequest, res: PBResponse): Promise<void>;
    updateSession(req: PBRequest, res: PBResponse): Promise<void>;
    updateSessionScope(req: PBRequest, res: PBResponse): Promise<void>;
    refreshSession(req: PBRequest, res: PBResponse): Promise<void>;
    private updatePresence;
}
export declare class RESTAdapterV2 extends ScopedPresenceAdapter {
    /**
     * By default, the session will expire in five minutes.
     */
    static DEFAULT_EXPIRY_MS: number;
    /** Format of Record<sessionID, scope> */
    sessionIndex: Record<string, string>;
    /** Format of Record<sessionID, number> */
    expirationTimeouts: Record<string, ReturnType<typeof setTimeout>>;
    /** Format of Record<sessionID, PresenceList> */
    presenceLedger: Record<string, PresenceDictionary>;
    sessionExpiryMS: number;
    api: RESTPresenceAPI;
    log: import("winston").Logger;
    constructor(app: TemplatedApp);
    /**
     * Creates a session for the given user, returning the session ID
     * @param user user ID
     */
    createSession(user: User | string | typeof FIRST_PARTY_SCOPE): string;
    /**
     * Destroys a given session
     * @param session session ID
     */
    destroySession(session: string): void;
    /**
     * Clears the expiration timeout for a session
     * @param session session ID
     */
    clearExpiry(session: string): void;
    /**
     * Schedules a deferred expiration of a session using the configured expiration
     * @param session session ID
     */
    scheduleExpiry(session: string): void;
    /**
     * Returns whether a given session can update a scope
     * @param sessionID session ID
     * @param scope scope
     */
    sessionCanUpdateScope(sessionID: string, scope: string): boolean;
    activityForUser(id: string): Promise<PresenceList>;
    activities(): Promise<Record<string, PresenceList>>;
    run(): void;
    /**
     * Creates a presence proxy that maps events to this adapter
     */
    private createPresenceTable;
}
