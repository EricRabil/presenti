import { Storage } from "../../database/entities/Storage";
import { ScopedPresenceAdapter } from "../../structs/scoped-adapter";
export declare abstract class StorageAdapter<T> extends ScopedPresenceAdapter {
    private identifier;
    private defaultStorage;
    constructor(identifier: string, defaultStorage: any);
    container(): Promise<Storage<T>>;
}
