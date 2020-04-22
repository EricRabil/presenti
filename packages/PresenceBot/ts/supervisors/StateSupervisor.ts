import { Evented } from "remote-presence-utils";
import { StateAdapter } from "../structs/state";
import { Supervisor } from "../structs/Supervisor";

/**
 * Data namespace for Presence State
 */
export class StateSupervisor extends Supervisor<StateAdapter> {
  async scopedData(scope: string, newSocket: boolean = false): Promise<Record<string, Record<string, any>>> {
    const state = await this.scopedState(scope, newSocket);

    return {
      state
    };
  }

  async globalData(newSocket: boolean = false): Promise<Record<string, Record<string, any>>> {
    return {};
  }
  
  async scopedState(scope: string, newSocket: boolean = false) {
    const resolvedStates = await Promise.all(this.adapters.map(adapter => adapter.data(scope, newSocket)));
    return resolvedStates.reduce((acc, cur) => Object.assign(acc, cur), {});
  }
}