import { PresenceList } from "../utils/utils-index";
import { EventBus, Events } from "../event-bus";
import { AdapterState } from "@presenti/utils";
import { TemplatedApp } from "uWebSockets.js";

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
  
  protected constructor(public provider: PresenceProvider, public app: TemplatedApp, subscribe: SubscribableEvents[] = []) {
    const handler = debounce(({ scope }) => this.updated(scope), 250);
    subscribe.forEach(event => EventBus.on(event, handler));
  }

  updated(scope: string): any {}

  async payload(scope: string, initial: boolean = false) {
    const presence = await this.provider.presence(scope, initial);
    const state = await this.provider.state(scope, initial);

    return {
      presence,
      state
    };
  }

  async run() {
    this.state = AdapterState.RUNNING;
  }
}