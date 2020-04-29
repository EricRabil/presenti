import "reflect-metadata";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { MasterSupervisor } from "./supervisors/master-supervisor";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-base";
import { AdapterSupervisor } from "./supervisors/adapter-supervisor";
/**
 * Tracks global and scoped (per-user presence)
 */
export declare class PresenceService {
    private port;
    private userQuery;
    /** Supervisor that tracks supervisors */
    supervisor: MasterSupervisor;
    /** WebSocket and Web server */
    app: TemplatedApp;
    /** Record of <scope, connections> */
    clients: Record<string, WebSocket[]>;
    /** Record of <connection, scope> */
    idMap: Map<WebSocket, string>;
    /** Record of <scope, latest payload> */
    scopedPayloads: Record<string, Record<string, any>>;
    /** Record of latest global payload */
    globalPayload: Record<string, any>;
    /** reference to the adapter supervisor */
    adapterSupervisor: AdapterSupervisor;
    /** logging instance */
    log: import("winston").Logger;
    constructor(port: number, userQuery: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>);
    /**
     * Allocates resources to a websocket with a scope ID
     * @param id scope ID
     * @param socket socket
     */
    mountClient(id: string, socket: WebSocket): void;
    /**
     * Deallocates resources for a websocket
     * @param socket socket to deallocate
     */
    unmountClient(socket: WebSocket): void;
    /**
     * Registers all adapters with the supervisor
     */
    registerAdapters(): void;
    /** Registers state adapters with the supervisor */
    registerStates(): void;
    /**
     * Dispatches the latest presence state to the given selector
     * @param selector selector to dispatch to
     */
    dispatchToSelector(selector: string, refresh?: boolean): Promise<void>;
    /**
     * Returns the latest payload for a scope, querying adapters if none has been cached already
     * @param scope
     * @param newSocket is this payload being sent for a new connection?
     * @param refresh should the cache be refreshed?
     */
    payloadForSelector(scope: string, newSocket?: boolean, refresh?: boolean): Promise<Record<string, any>>;
    /**
     * Dispatches to a set of selectors, or all connected users
     * @param selector selectors to dispatch to
     */
    dispatch(selector?: string | string[], refresh?: boolean): Promise<Promise<void>[]>;
    /**
     * Starts the presence service
     */
    run(): Promise<void>;
}
export * from "./adapters/presence/rest-adapter";
export * from "./adapters/presence/socket-adapter";
export * from "./adapters/state/gradient-state";
export * from "./supervisors/adapter-supervisor";
export * from "./supervisors/state-supervisor";
export * from "./supervisors/master-supervisor";
export * from "./structs/adapter";
export * from "./structs/rest-api-base";
export * from "./structs/scoped-adapter";
export * from "./structs/socket-api-base";
export * from "./structs/state";
export * from "./structs/supervisor";
export * from "./utils";
export * from "./web";
