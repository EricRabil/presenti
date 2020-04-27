import { PresenceStruct } from "remote-presence-utils";
export declare type PresenceItem = Partial<PresenceStruct>;
export declare type PresenceList = PresenceItem[];
export declare type PresenceDictionary = Record<string, PresenceList>;
export declare interface PresenceTable {
    on(event: "changed", handler: (scope: string) => any): this;
    emit(event: "changed", scope: string): boolean;
}
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
    function createPresenceDictCondenser(ledger: Record<string, PresenceDictionary>): Record<string, PresenceList>;
}
