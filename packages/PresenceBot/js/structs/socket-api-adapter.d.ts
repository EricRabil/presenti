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
export declare class SocketContext<T extends SocketAPIAdapter = SocketAPIAdapter> {
    readonly ws: WebSocket;
    private adapter;
    close: () => WebSocket;
    static socketLog: import("winston").Logger;
    readonly id: string;
    constructor(ws: WebSocket, adapter: T);
    send(type: PayloadType, data?: any): void;
    private get log();
    get scope(): string | typeof FIRST_PARTY_SCOPE;
    get authenticated(): boolean;
    get firstParty(): boolean;
    get dead(): boolean;
    private assertAlive;
}
interface HandlerStruct<T = any> {
    property: keyof T;
    handler: Function;
}
export interface HandlerMetadata {
    authed: boolean;
    denyAuthed: boolean;
    firstParty: boolean;
    denyFirstParty: boolean;
}
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
    pingHandler(ws: SocketContext): void;
    closed(id: string): any;
    authenticate(ws: WebSocket | SocketContext, scope: string | typeof FIRST_PARTY_SCOPE): void;
    isAuthenticated(ws: WebSocket): boolean;
    isFirstParty(ws: WebSocket): boolean;
}
export {};
