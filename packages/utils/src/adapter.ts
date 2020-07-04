import { Presence, AdapterState } from "./types";

export interface IEvented {
  on(event: string, listener: Function): IEvented;
  off(event: string, listener: Function): IEvented;
  emit(event: string, ...args: any[]): boolean;
}

var Evented = class EventedPolyfill implements IEvented {
  constructor() {
    (this as any)._listeners = {};
  }

  on(event: string, listener: Function): IEvented {
    if (!(this as any)._listeners[event]) (this as any)._listeners[event] = [];
    if ((this as any)._listeners[event] && (this as any)._listeners[event].includes(listener)) return this;
    (this as any)._listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Function): IEvented {
    if (!(this as any)._listeners[event] || !(this as any)._listeners[event].includes(listener)) return this;
    (this as any)._listeners[event].splice((this as any)._listeners[event].indexOf(listener), 1);
    if ((this as any)._listeners[event].length === 0) delete (this as any)._listeners[event];
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!(this as any)._listeners[event] || (this as any)._listeners[event].length === 0) return false;
    (this as any)._listeners[event].forEach((listener: Function) => listener.apply(this, args));
    return true;
  }
}

if (typeof globalThis === "object" && (globalThis as any)?.process?.release?.name) {
  Evented = require("events").EventEmitter;
}

export { Evented }

export declare interface PresenceAdapter {
  on(event: 'updated', listener: () => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'updated'): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export abstract class PresenceAdapter extends Evented {
  state: AdapterState = AdapterState.READY;
  abstract run(): Promise<void> | void;
  abstract activity(): Promise<Presence> | Presence;
}