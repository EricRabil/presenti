import { Presence, PresenceAdapter, Evented, PresentiUser, OAUTH_PLATFORM } from "remote-presence-utils";
import { RemotePayload, FirstPartyPresenceData } from "remote-presence-utils";
import winston from "winston";
export interface RemoteClientOptions {
    /** Format of "://localhost:8138", "s://api.ericrabil.com" */
    host: string;
    token: string;
    reconnect?: boolean;
    reconnectGiveUp?: number;
    reconnectInterval?: number;
    logging?: boolean;
}
export declare interface RemoteClient {
    on(event: "presence", listener: (presence: Presence[]) => any): this;
    on(event: "close", listener: () => any): this;
    on(event: "ready", listener: () => any): this;
    on(event: string, listener: Function): this;
    emit(event: "presence", presence: Presence[]): boolean;
    emit(event: "close"): boolean;
    emit(event: "ready"): boolean;
    emit(event: string, ...args: any[]): boolean;
}
/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
export declare class RemoteClient extends Evented {
    private options;
    socket: WebSocket;
    ready: boolean;
    adapters: PresenceAdapter[];
    log: winston.Logger;
    constructor(options: RemoteClientOptions);
    private initialize;
    /**
     * Starts the RemoteClient
     */
    run(): Promise<void>;
    /**
     * Registers a PresenceAdapter to the client
     * @param adapter adapter to register
     */
    register(adapter: PresenceAdapter): void;
    /**
     * Sends the latest presence data to the server
     */
    sendLatestPresence(): any;
    /**
     * Closes the connection
     */
    close(): void;
    private _retryCounter;
    private _killed;
    private _buildSocket;
    terminationHandler(): void;
    /**
     * Pings after 30 seconds
     */
    deferredPing(): void;
    /**
     * Pings
     */
    ping(): void;
    /**
     * Sends a presence update packet
     * @param data presence data
     */
    presence(data?: Presence[]): void;
    /**
     * Updates the presence for a given scope. Requires first-party token.
     * Calling this endpoint without a first-party token will terminate the connection.
     * @param data presence update dto
     */
    updatePresenceForScope(data: FirstPartyPresenceData): void;
    /**
     * Query presenti for data related to a scope
     * @param userID scope/user ID
     */
    lookupUser(userID: string): Promise<PresentiUser | null>;
    /**
     * Query presenti for a user given a platform and the platform ID
     * @param platform platform
     * @param linkID id
     */
    platformLookup(platform: OAUTH_PLATFORM, linkID: string): Promise<PresentiUser | null>;
    get headers(): {
        authorization: string;
    };
    get socketEndpoint(): string;
    get ajaxBase(): string;
    /**
     * Sends a packet to the server
     * @param payload data
     */
    send(payload: RemotePayload): void;
}
