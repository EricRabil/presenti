import events, { EventEmitter } from "events";
import { Evented, AdapterState, PresenceAdapter, Presence } from "remote-presence-utils";

export interface AdapterStruct extends Evented {
  on(event: "updated", listener: (scope?: string) => any): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "updated", scope?: string): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;

  readonly state: AdapterState;
  run(): Promise<void> | void;
}

export declare interface NativePresenceAdapter {
  on(event: 'updated', listener: () => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'updated'): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

/** Node.JS-only adapter that uses the native events library */
export abstract class NativePresenceAdapter extends EventEmitter implements PresenceAdapter {
  state: AdapterState = AdapterState.READY;
  abstract run(): Promise<void> | void;
  abstract activity(): Promise<Presence> | Presence;
}