import { Presence, AdapterState } from "./types";
export interface IEvented {
    on(event: string, listener: Function): this;
    off(event: string, listener: Function): this;
    emit(event: string, ...args: any[]): boolean;
}
export declare class Evented implements IEvented {
    private _listeners;
    on(event: string, listener: Function): this;
    off(event: string, listener: Function): this;
    emit(event: string, ...args: any[]): boolean;
}
export declare interface PresenceAdapter {
    on(event: 'updated', listener: () => any): this;
    on(event: string, listener: Function): this;
    emit(event: 'updated'): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}
export declare abstract class PresenceAdapter extends Evented {
    state: AdapterState;
    abstract run(): Promise<void> | void;
    abstract activity(): Promise<Presence> | Presence;
}
