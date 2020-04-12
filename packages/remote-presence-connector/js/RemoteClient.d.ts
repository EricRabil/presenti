import { Presence, PresenceAdapter, Evented } from "remote-presence-utils";
import { RemotePayload } from "remote-presence-utils";
export interface RemoteClientOptions {
    url: string;
    token: string;
    reconnect?: boolean;
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
    constructor(options: RemoteClientOptions);
    private initialize;
    /**
     * Starts the RemoteClient
     */
    run(): void;
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
    presence(data: Presence[]): void;
    /**
     * Sends a packet to the server
     * @param payload data
     */
    send(payload: RemotePayload): void;
}
