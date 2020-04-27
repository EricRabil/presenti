import { StateAdapter } from "../structs/state";
import { Supervisor } from "../structs/Supervisor";
export declare let SharedStateSupervisor: StateSupervisor;
/**
 * Data namespace for Presence State
 */
export declare class StateSupervisor extends Supervisor<StateAdapter> {
    constructor();
    scopedData(scope: string, newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
    scopedDatas(): Promise<{}>;
    globalData(newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
    scopedState(scope: string, newSocket?: boolean): Promise<object>;
}
