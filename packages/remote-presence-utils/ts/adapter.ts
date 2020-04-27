import { Presence, AdapterState } from "./types";

export interface IEvented {
  on(event: string, listener: Function): this;
  off(event: string, listener: Function): this;
  emit(event: string, ...args: any[]): boolean;
}

export class Evented implements IEvented {
  private _listeners: Record<string, Function[]> = {};

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
    this._listeners[event].forEach(listener => listener.apply(this, args));
    return true;
  }
}

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