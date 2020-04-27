import { ScopedPresenceAdapter } from "../structs/scoped-adapter";
import { AdapterState, PresenceStruct } from "remote-presence-utils";
import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { FIRST_PARTY_SCOPE } from "../structs/socket-api-adapter";
export declare enum StatusCodes {
    BAD_REQ = "400 Bad Request",
    UNAUTHORIZED = "401 Unauthorized",
    OK = "200 OK"
}
export declare const Responses: Record<string, [string, string]>;
export interface RESTAdapterOptions {
    sessionExpiryMS?: number;
}
export declare function handler(exec: (res: HttpResponse, req: HttpRequest) => any, headers?: string[]): typeof exec;
export declare class RESTAdapter extends ScopedPresenceAdapter {
    private validate;
    readonly options: RESTAdapterOptions;
    /**
     * By default, the session will expire in five minutes.
     */
    static DEFAULT_EXPIRY_MS: number;
    sessionIndex: Record<string, string>;
    expirationTimeouts: Record<string, number>;
    presences: Record<string, Array<Partial<PresenceStruct>>>;
    state: AdapterState;
    constructor(app: TemplatedApp, validate: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>, options?: RESTAdapterOptions);
    /**
     * Creates a session for the given user, returning the session ID
     * @param user user ID
     */
    createSession(user: string): string;
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
    activityForUser(id: string): Promise<Partial<PresenceStruct>[]>;
    activities(): Promise<Record<string, import("../utils/presence-magic").PresenceList>>;
    run(): Promise<void>;
    activity(): never[];
}
