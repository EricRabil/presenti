import { PresenceStruct } from "remote-presence-utils";
export declare type PresenceList = Array<Partial<PresenceStruct>>;
export declare type PresenceDictionary = Record<string, PresenceList>;
/** A series of proxy builders that emit "updated" events when their contents are changed */
export declare namespace PresenceMagic {
    /**
     * Returns an array that will emit a changed event if the contents of it are changed.
     * @param evented event listener
     * @param scope
     */
    function createArrayProxy<T extends any[]>(changed: () => any): T;
    /**
     * Returns a dictionary of presence arrays, and emits a changed event if the contents of it are changed.
     * @param evented
     */
    function createPresenceProxy<T extends Record<string, object>>(changed: (scope: string) => any): T;
    /**
     * Creates a Proxy that condenses a bunch of Presence objects for a scope into a single presence list
     * @param ledger ledger of scopes to their various scope objects
     */
    function createPresenceDictCondenser(ledger: Record<string, PresenceDictionary>): Record<string, PresenceList>;
}
