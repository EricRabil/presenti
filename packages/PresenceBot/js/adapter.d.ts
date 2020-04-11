/// <reference types="node" />
import { EventEmitter } from "events";
import { Activity } from "discord.js";
export declare interface PresenceAdapter {
    on(event: 'presence', listener: () => any): this;
    on(event: string, listener: Function): this;
    emit(event: 'presence'): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}
export declare enum AdapterState {
    READY = 0,
    RUNNING = 1
}
export declare type Presence = Partial<Activity> | Array<Partial<Activity>> | undefined;
export declare abstract class PresenceAdapter extends EventEmitter {
    abstract readonly state: AdapterState;
    abstract run(): Promise<void>;
    abstract activity(): Promise<Presence>;
}
