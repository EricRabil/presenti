import { Presence, PresenceAdapter } from "remote-presence-utils";
import { RemotePayload } from "remote-presence-utils";
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
    adapters: PresenceAdapter[];
    constructor(options: RemoteClientOptions);
    private initialize;
    run(): void;
    register(adapter: PresenceAdapter): void;
    sendLatestPresence(): any;
    private _retryCounter;
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
