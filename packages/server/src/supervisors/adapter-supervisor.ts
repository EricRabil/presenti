import { AdapterState, PresenceAdapter, PresenceStruct } from "@presenti/utils";
import { ScopedPresenceAdapter } from "../structs/scoped-adapter";
import { Supervisor } from "../structs/supervisor";
import { log } from "../utils/logging";
import { PresenceList } from "../utils/presence-magic";

export let SharedAdapterSupervisor: AdapterSupervisor;

/**
 * Data namespace for Presence Data
 */
export class AdapterSupervisor extends Supervisor<PresenceAdapter> {
  log = log.child({ name: "AdapterSupervisor" });

  constructor() {
    super();
    SharedAdapterSupervisor = this;
  }

  async run() {
    await super.run();
  }

  scopedData(scope: string): Promise<PresenceList> {
    this.log.debug("Querying all adapters for presence data for scope", { scope });
    return <any>Promise.all(
      this.adapters.filter(adapter => (
        (adapter.state === AdapterState.RUNNING) && (adapter instanceof ScopedPresenceAdapter)
      )).map(adapter => (
        (adapter as ScopedPresenceAdapter).activityForUser(scope)
      ))
    ).then(activities => (
      activities.filter(activity => (
        !!activity
      )).map(activity => (
        Array.isArray(activity) ? activity : [activity]
      )).reduce((a, c) => a.concat(c), [])
    ));
  }

  async scopedDatas(): Promise<Record<string, PresenceList>> {
    const activities = await Promise.all(this.adapters.filter(adapter => adapter instanceof ScopedPresenceAdapter).map((adapter) => (adapter as unknown as ScopedPresenceAdapter).activities()));
    return activities.reduce((acc, c) => {
      Object.entries(c).forEach(([scope, presences]) => {
        if (acc[scope]) acc[scope] = acc[scope].concat(presences);
        else acc[scope] = presences;
      });
      return acc;
    }, {})
  }

  globalData(): Promise<{presences: Array<Partial<PresenceStruct>>}> {
    return <any>Promise.all(
      this.adapters.filter(adapter => (
        adapter.state === AdapterState.RUNNING
      )).map(adapter => (
        !(adapter instanceof ScopedPresenceAdapter) ? adapter.activity() : []
      ))
    ).then(activities => (
      activities.filter(activity => (
        !!activity
      )).map(activity => (
        Array.isArray(activity) ? activity : [activity]
      )).reduce((a, c) => a.concat(c), [])
    ));
  }
}