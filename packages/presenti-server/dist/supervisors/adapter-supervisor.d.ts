import { PresenceAdapter, PresenceStruct } from "remote-presence-utils";
import { Supervisor } from "../structs/supervisor";
import { PresenceList } from "../utils/presence-magic";
export declare let SharedAdapterSupervisor: AdapterSupervisor;
/**
 * Data namespace for Presence Data
 */
export declare class AdapterSupervisor extends Supervisor<PresenceAdapter> {
    log: import("winston").Logger;
    constructor();
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
