import { PresenceAdapter, PresenceStruct } from "remote-presence-utils";
import { TemplatedApp } from "uWebSockets.js";
import { Supervisor } from "../structs/Supervisor";
export declare let SharedAdapterSupervisor: AdapterSupervisor;
/**
 * Data namespace for Presence Data
 */
export declare class AdapterSupervisor extends Supervisor<PresenceAdapter> {
    private app;
    shades: Record<string, string[]>;
    constructor(app: TemplatedApp);
    scopedData(scope: string): Promise<{
        presences: Array<Partial<PresenceStruct>>;
    }>;
    globalData(): Promise<{
        presences: Array<Partial<PresenceStruct>>;
    }>;
}
