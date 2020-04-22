import { StateAdapter } from "../structs/state";
import { Supervisor } from "../structs/Supervisor";
/**
 * Data namespace for Presence State
 */
export declare class StateSupervisor extends Supervisor<StateAdapter> {
    scopedData(scope: string, newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
    globalData(newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
    scopedState(scope: string, newSocket?: boolean): Promise<object>;
}
