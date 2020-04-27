import { Evented } from "remote-presence-utils";
import { StateAdapter } from "../structs/state";
import { Supervisor } from "../structs/supervisor";

export let SharedStateSupervisor: StateSupervisor;

/**
 * Data namespace for Presence State
 */
export class StateSupervisor extends Supervisor<StateAdapter> {
  constructor() {
    super();
    SharedStateSupervisor = this;
  }

  async scopedData(scope: string, newSocket: boolean = false): Promise<Record<string, Record<string, any>>> {
    const state = await this.scopedState(scope, newSocket);

    return {
      state
    };
  }

  async scopedDatas() {
    const states = await Promise.all(this.adapters.map(adapter => adapter.datas()));
    return Object.entries(states.reduce((acc, c) => {
      Object.entries(c).forEach(([scope, state]) => {
        if (acc[scope]) acc[scope] = Object.assign(acc[scope], state);
        else acc[scope] = state;
        return acc;
      });
      return acc;
    }, {})).reduce((acc, [scope, presences]) => Object.assign(acc, {[scope]: presences }), {});
  }

  async globalData(newSocket: boolean = false): Promise<Record<string, Record<string, any>>> {
    return {};
  }
  
  async scopedState(scope: string, newSocket: boolean = false) {
    const resolvedStates = await Promise.all(this.adapters.map(adapter => adapter.data(scope, newSocket)));
    return resolvedStates.reduce((acc, cur) => Object.assign(acc, cur), {});
  }
}