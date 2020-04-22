import { AdapterStruct } from "../utils";
import { AdapterState, Evented } from "remote-presence-utils";
export declare interface Supervisor<T extends AdapterStruct> {
    on(event: "updated", listener: (scope?: string) => any): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: "updated", scope?: string): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}
/**
 * Represents an aggregator/manager of a class of adapters
 */
export declare abstract class Supervisor<T extends AdapterStruct> extends Evented {
    adapters: T[];
    state: AdapterState;
    register(adapter: T): void;
    updated(id?: string): void;
    run(): Promise<void>;
    abstract scopedData(scope: string, newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
    abstract globalData(newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
}
