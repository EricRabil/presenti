import { Presence, AdapterState } from "./types";
export declare class Evented {
    _listeners: Record<string, Function[]>;
    on(event: string, listener: Function): this;
    off(event: string, listener: Function): this;
    emit(event: string, ...args: any[]): boolean;
}
export declare interface PresenceAdapter {
    on(event: 'presence', listener: () => any): this;
    on(event: string, listener: Function): this;
    emit(event: 'presence'): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}
export declare abstract class PresenceAdapter extends Evented {
    abstract readonly state: AdapterState;
    abstract run(): Promise<void>;
    abstract activity(): Promise<Presence>;
}
