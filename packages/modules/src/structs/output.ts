import { PresenceList, PresentiAPIClient } from "@presenti/utils";
import { Events } from "@presenti/utils";
import { AdapterState } from "@presenti/utils";
import { TemplatedApp } from "uWebSockets.js";
import { RestAPIBase } from "@presenti/web";
import { PresentiAPI } from "@presenti/utils/dist/structs/api-spec";
import { PresenceCacheBuilder, StateCacheBuilder } from "@presenti/core-cache";

export interface PresenceProvider {
  presences: ReturnType<typeof PresenceCacheBuilder>;
  states: ReturnType<typeof StateCacheBuilder>;
  presence(scope: string, initial?: boolean): Promise<PresenceList>;
  state(scope: string, initial?: boolean): Promise<Record<string, any>>;
  api: PresentiAPI;
}

export type SubscribableEvents = Events.STATE_UPDATE | Events.PRESENCE_UPDATE;

export abstract class PresenceOutput {
  state: AdapterState = AdapterState.READY;
  private _api: RestAPIBase;
  
  protected constructor(public provider: PresenceProvider, public app: TemplatedApp, events: SubscribableEvents[] = [], private apiHeaders: string[] = []) {
  }

  updated(scope: string): any {}

  protected get api() {
    return this._api || (this._api = new RestAPIBase(this.app, this.apiHeaders));
  }

  protected set api(api) {
    this._api = api;
  }

  async payload(scope: string, initial: boolean = false) {
    const presence = await this.provider.presence(scope, initial);
    const state = await this.provider.state(scope, initial);

    return {
      presence,
      state
    };
  }

  async run() {
    this._api?.run();
    this.state = AdapterState.RUNNING;
  }
}