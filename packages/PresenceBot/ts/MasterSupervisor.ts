import { Supervisor } from "./structs/Supervisor";

/**
 * Aggregates events from all supervisors and funnels them through this class
 */
export class MasterSupervisor extends Supervisor<Supervisor<any>> {
  async scopedData(scope: string, newSocket: boolean = false): Promise<Record<string, Record<string, any>>> {
    const resolvedData = await Promise.all(this.adapters.map(adapter => adapter.scopedData(scope, newSocket)));
    return resolvedData.reduce((acc, cur) => Object.assign(acc, cur), {});
  }

  async scopedDatas() {
    const datas = await Promise.all(this.adapters.map(adapter => adapter.scopedDatas()));
    return datas.reduce((acc, cur) => {
      Object.entries(cur).forEach(([scope, data]) => {
        if (!acc[scope]) acc[scope] = data;
        else acc[scope] = Object.assign(acc[scope], data);
      });
      return acc;
    });
  }

  async globalData(newSocket: boolean = false): Promise<Record<string, Record<string, any>>> {
    const resolvedData = await Promise.all(this.adapters.map(adapter => adapter.globalData(newSocket)));
    return resolvedData.reduce((acc, cur) => Object.assign(acc, cur), {});
  }
}