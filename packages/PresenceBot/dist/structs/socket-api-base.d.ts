import { PayloadType, IdentifyPayload } from "remote-presence-utils";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { ScopedPresenceAdapter } from "./scoped-adapter";
export declare function Handler(payloadType: PayloadType): <T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor | undefined) => void;
export declare const Authed: (value?: boolean) => <T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor | undefined) => void;
export declare const FirstParty: (value?: boolean) => <T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor | undefined) => void;
export declare const DenyFirstParty: (value?: boolean) => <T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor | undefined) => void;
export declare const DenyAuthed: (value?: boolean) => <T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor | undefined) => void;
export declare type PayloadHandler = (ws: WebSocket, data: any) => any;
export declare const FIRST_PARTY_SCOPE: unique symbol;
/** Contextual wrapper for socket connections */
export declare class SocketContext<T extends SocketAPIAdapter = SocketAPIAdapter> {
    readonly ws: WebSocket;
    private adapter;
    static socketLog: import("winston").Logger;
    readonly id: string;
    constructor(ws: WebSocket, adapter: T);
    close(): void;
    /**
     * Sends a payload to the socket
     * @param type payload type
     * @param data data to send, null if empty
     */
    send(type: PayloadType, data?: any): void;
    private get log();
    /** The scope this socket is connected to */
    get scope(): string | typeof FIRST_PARTY_SCOPE;
    /** Whether the socket has authenticated with the server */
    get authenticated(): boolean;
    /** Whether the socket is a first-party connection */
    get firstParty(): boolean;
    /** Whether the socket is closed */
    get dead(): boolean;
    private assertAlive;
}
interface HandlerStruct<T = any> {
    property: keyof T;
    handler: Function;
}
interface HandlerMetadata {
    authed: boolean;
    denyAuthed: boolean;
    firstParty: boolean;
    denyFirstParty: boolean;
}
/** Foundation for any socket-based API */
export declare abstract class SocketAPIAdapter extends ScopedPresenceAdapter {
    /**
     * A map of sockets to their scope ID
     */
    sockets: Map<WebSocket, string | typeof FIRST_PARTY_SCOPE>;
    contexts: Map<WebSocket, SocketContext>;
    handlers: Record<PayloadType, HandlerStruct<this>>;
    handlerMetadata: Record<keyof this, HandlerMetadata>;
    log: import("winston").Logger;
    constructor(app: TemplatedApp, path: string);
    /**
     * Identification handler for sockets. Must return true if authentication failed, and false if otherwise.
     * @param ws socket context
     * @param data payload data
     */
    identificationHandler(ws: SocketContext, token: IdentifyPayload["data"], sendGreetings?: boolean): Promise<boolean>;
    /**
     * Expert ping-pong player.
     * @param ws socket context
     */
    pingHandler(ws: SocketContext): void;
    /**
     * Called upon close
     * @param id socket ID
     */
    closed(id: string): any;
    /**
     * Marks a socket as authenticated with the given scope
     * @param ws socket/socket context
     * @param scope socket scope
     */
    authenticate(ws: WebSocket | SocketContext, scope: string | typeof FIRST_PARTY_SCOPE): void;
    /**
     * Returns true if the socket is authenticated
     * @param ws socket
     */
    isAuthenticated(ws: WebSocket): boolean;
    /**
     * Returns true if the socket is first-party scoped
     * @param ws socket
     */
    isFirstParty(ws: WebSocket): boolean;
}
export {};
