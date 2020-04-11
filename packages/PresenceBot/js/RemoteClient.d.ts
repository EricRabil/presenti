import { Presence } from "./adapter";
import { RemotePayload } from "./adapters/RemoteAdapter";
import WebSocket from "ws";
export interface RemoteClientOptions {
    url: string;
    token: string;
}
/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
export declare class RemoteClient {
    private options;
    socket: WebSocket;
    ready: boolean;
    constructor(options: RemoteClientOptions);
    run(): void;
    private _retryCounter;
    private _buildSocket;
    /**
     * Pings after 30 seconds
     */
    deferredPing(): void;
    /**
     * Pings
     */
    ping(): Promise<unknown>;
    /**
     * Sends a presence update packet
     * @param data presence data
     */
    presence(data: Presence[]): Promise<unknown>;
    /**
     * Sends a packet to the server
     * @param payload data
     */
    send(payload: RemotePayload): Promise<unknown>;
}
