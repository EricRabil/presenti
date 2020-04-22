import { PresenceAdapter, AdapterState, Presence, PresenceStruct } from "remote-presence-utils";
import { EventEmitter } from "events";
import { Activity } from "discord.js";
import { TemplatedApp } from "uWebSockets.js";
import { ScopedPresenceAdapter } from "../structs/scoped-adapter";
import { Supervisor } from "../structs/Supervisor";
import { PresentiKit } from "../utils";

export let SharedAdapterSupervisor: AdapterSupervisor;

/**
 * Data namespace for Presence Data
 */
export class AdapterSupervisor extends Supervisor<PresenceAdapter> {
  shades: Record<string, string[]> = {};

  constructor(private app: TemplatedApp) {
    super();
    SharedAdapterSupervisor = this;
  }

  scopedData(scope: string): Promise<{presences: Array<Partial<PresenceStruct>>}> {
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
    )).then(presences => ({ presences }))
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