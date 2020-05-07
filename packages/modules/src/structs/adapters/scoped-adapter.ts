import { Presence } from "@presenti/utils";
import { PresenceDictionary } from "@presenti/utils";
import { NativePresenceAdapter } from "./adapter";

export declare interface ScopedPresenceAdapter {
  on(event: 'updated', listener: (id: string) => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'updated', id: string): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export abstract class ScopedPresenceAdapter extends NativePresenceAdapter {
  /** Returns the presence data for the given scope */
  abstract activityForUser(id: string): Promise<Presence> | Presence;
  /** Returns all presence data for all scopes, typically used when bootstrapping the service */
  abstract activities(): Promise<PresenceDictionary> | PresenceDictionary;

  /**
   * It doesn't make sense to return a mono-array of all presences for scoped adapters, so this should return an empty array.
   */
  activity(): Promise<never[]> | never[] {
    return [];
  }
}