import { Evented, PresenceStruct } from "remote-presence-utils";
export interface PresenceStreamOptions {
    url?: string;
    reconnectInterval?: number;
}
export declare interface PresenceStream {
    on(event: "presence", listener: (presence: PresenceStruct[]) => any): this;
    on(event: string, listener: Function): this;
    emit(event: "presence", presence: PresenceStruct[]): boolean;
    emit(event: string, ...args: any[]): boolean;
}
export declare class PresenceStream extends Evented {
    private scope;
    private options;
    static readonly DEFAULT_URL = "wss://api.ericrabil.com/presence/";
    static readonly DEFAULT_RECONNECT = 5000;
    socket: WebSocket | null;
    constructor(scope: string, options?: PresenceStreamOptions);
    private _killed;
    close(): void;
    connect(): void;
    get url(): string;
}
