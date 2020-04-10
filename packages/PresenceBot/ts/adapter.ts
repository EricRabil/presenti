import { EventEmitter } from "events";
import { Activity } from "discord.js";

export declare interface PresenceAdapter {
  on(event: 'presence', listener: (p: Activity) => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'presence'): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export enum AdapterState {
  READY, RUNNING
}

export abstract class PresenceAdapter extends EventEmitter {
  abstract readonly state: AdapterState;
  abstract run(): Promise<void>;
  abstract activity(): Promise<Partial<Activity> | undefined>;
}