import { PresenceAdapter, Presence } from "remote-presence-utils";
import { PresenceDictionary } from "../utils/presence-magic";

export declare interface ScopedPresenceAdapter {
  on(event: 'updated', listener: (id: string) => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'updated', id: string): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export abstract class ScopedPresenceAdapter extends PresenceAdapter {
  abstract activityForUser(id: string): Promise<Presence> | Presence;
  abstract activities(): Promise<PresenceDictionary> | PresenceDictionary;

  /**
   * It doesn't make sense to return a mono-array of all presences for scoped adapters.
   */
  activity(): Promise<never[]> | never[] {
    return [];
  }
}