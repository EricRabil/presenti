import { WebSocket, TemplatedApp } from "uWebSockets.js";
import { PresenceStruct } from "remote-presence-utils";
import { AdapterSupervisor } from "./AdapterSupervisor";
/**
 * Tracks global and scoped (per-user presence)
 */
export declare class PresenceService {
    private port;
    private userQuery;
    supervisor: AdapterSupervisor;
    app: TemplatedApp;
    clients: Record<string, WebSocket[]>;
    idMap: Map<WebSocket, string>;
    scopedPayloads: Record<string, Array<Partial<PresenceStruct>>>;
    globalPayload: Array<Partial<PresenceStruct>>;
    constructor(port: number, userQuery: (token: string) => Promise<string | null>);
    /**
     * Merges latest global payload with the latest scoped payload
     * @param id scope id
     */
    latest(id?: string): Array<Partial<PresenceStruct>>;
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
    shades: Record<string, string[]>;
    /**
     * Dispatches the latest presence state to the given selector
     * @param selector selector to dispatch to
     */
    dispatchToSelector(selector: string): Promise<void>;
    /**
     * Dispatches to a set of selectors, or all connected users
     * @param selector selectors to dispatch to
     */
    dispatch(selector?: string | string[]): Promise<Promise<void>[]>;
    /**
     * Starts the presence service
     */
    run(): Promise<void>;
}
export { SpotifyAdapter } from "./adapters/SpotifyAdapter";
export { DiscordAdapter } from "./adapters/DiscordAdapter";
