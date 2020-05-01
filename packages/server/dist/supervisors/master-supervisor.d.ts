import { Supervisor } from "../structs/supervisor";
/**
 * Aggregates events from all supervisors and funnels them through this class
 */
export declare class MasterSupervisor extends Supervisor<Supervisor<any>> {
    scopedData(scope: string, newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
    scopedDatas(): Promise<Record<string, Record<string, Record<string, any>>>>;
    globalData(newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
}
