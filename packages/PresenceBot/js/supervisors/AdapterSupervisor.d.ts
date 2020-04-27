import { PresenceAdapter, PresenceStruct } from "remote-presence-utils";
import { TemplatedApp } from "uWebSockets.js";
import { Supervisor } from "../structs/Supervisor";
import { PresenceList } from "../utils/presence-magic";
export declare let SharedAdapterSupervisor: AdapterSupervisor;
/**
 * Data namespace for Presence Data
 */
export declare class AdapterSupervisor extends Supervisor<PresenceAdapter> {
    private app;
    log: import("winston").Logger;
    constructor(app: TemplatedApp);
    run(): Promise<void>;
    scopedData(scope: string): Promise<{
        presences: Array<Partial<PresenceStruct>>;
    }>;
    scopedDatas(): Promise<Record<string, {
        presences: PresenceList;
    }>>;
    globalData(): Promise<{
        presences: Array<Partial<PresenceStruct>>;
    }>;
}
