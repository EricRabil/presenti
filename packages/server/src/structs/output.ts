import { PresenceList } from "../utils/utils-index";
import { EventBus, Events } from "../event-bus";
import { AdapterState } from "@presenti/utils";
import { TemplatedApp } from "uWebSockets.js";
import { RestAPIBase } from "@presenti/web";

function debounce (fn: Function, wait = 1) {
  let timeout
  return function (...args) {
		if (timeout) return;
    timeout = setTimeout(() => {fn.call(null, ...args); timeout = null;}, wait)
  }
}

export interface PresenceProvider {
  presence(scope: string, initial?: boolean): Promise<PresenceList>;
  state(scope: string, initial?: boolean): Promise<Record<string, any>>;
}

export type SubscribableEvents = Events.STATE_UPDATE | Events.PRESENCE_UPDATE;

export abstract class PresenceOutput {
  state: AdapterState = AdapterState.READY;
  private _api: RestAPIBase;
  
  protected constructor(public provider: PresenceProvider, public app: TemplatedApp, subscribe: SubscribableEvents[] = [], private apiHeaders: string[] = []) {
    const handler = debounce(({ scope }) => this.updated(scope), 250);
    subscribe.forEach(event => EventBus.on(event, handler));
  }

  updated(scope: string): any {}

  protected get api() {
    return this._api || (this._api = new RestAPIBase(this.app, undefined, this.apiHeaders));
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