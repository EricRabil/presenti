import { Presence, AdapterState } from "./types";

class Evented {
  _listeners: Record<string, Function[]> = {};

  on(event: string, listener: Function): this {
    if (!this._listeners[event]) this._listeners[event] = [];
    if (this._listeners[event] && this._listeners[event].includes(listener)) return this;
    this._listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (!this._listeners[event] || !this._listeners[event].includes(listener)) return this;
    this._listeners[event].splice(this._listeners[event].indexOf(listener), 1);
    if (this._listeners[event].length === 0) delete this._listeners[event];
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this._listeners[event] || this._listeners[event].length === 0) return false;
    this._listeners[event].forEach(listener => listener(...args));
    return true;
  }
}

export declare interface PresenceAdapter {
  on(event: 'presence', listener: () => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'presence'): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export abstract class PresenceAdapter extends Evented {
  abstract readonly state: AdapterState;
  abstract run(): Promise<void>;
  abstract activity(): Promise<Presence>;
}