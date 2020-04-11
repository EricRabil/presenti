import { PresenceAdapter, AdapterState, Presence } from "./adapter";
import { EventEmitter } from "events";
import { Activity } from "discord.js";
import { TemplatedApp } from "uWebSockets.js";
import { ScopedPresenceAdapter } from "./scoped-adapter";

export interface SupervisorUpdateEvent {
  $selector?: string;
}

export declare interface AdapterSupervisor {
  on(event: "updated", listener: (event: SupervisorUpdateEvent) => any): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "updated", activities: SupervisorUpdateEvent): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export class AdapterSupervisor extends EventEmitter {
  adapters: PresenceAdapter[] = [];

  constructor(private app: TemplatedApp) {
    super();
  }

  register(adapter: PresenceAdapter) {
    if (this.adapters.includes(adapter)) {
      throw new Error("Cannot register an adapter more than once.");
    }
    this.adapters.push(
      adapter instanceof ScopedPresenceAdapter
        ? adapter.on("presence", this.updated.bind(this))
        : adapter.on("presence", () => this.updated())
    );
  }

  async updated(id?: string) {
    this.emit("updated", {
      $selector: id
    });
  }

  initialize() {
    return Promise.all(
      this.adapters.filter(adapter => (
        adapter.state === AdapterState.READY
      )).map(adapter => (
        adapter.run()
      ))
    );
  }

  scopedActivities(id: string): Promise<Array<Partial<Activity>>> {
    return <any>Promise.all(
      this.adapters.filter(adapter => (
        (adapter.state === AdapterState.RUNNING) && (adapter instanceof ScopedPresenceAdapter)
      )).map(adapter => (
        (adapter as ScopedPresenceAdapter).activityForUser(id)
      ))
    ).then(activities => (
      activities.filter(activity => (
        !!activity
      )).map(activity => (
        Array.isArray(activity) ? activity : [activity]
      )).reduce((a, c) => a.concat(c), [])
    ))
  }

  globalActivities(): Promise<Array<Partial<Activity>>> {
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