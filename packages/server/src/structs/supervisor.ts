import { log } from "../utils/logging";
import { EventEmitter } from "events";
import { AdapterState, Evented } from "@presenti/utils";
import { AdapterStruct } from "./adapter";

export declare interface Supervisor<T extends AdapterStruct> {
  on(event: "updated", listener: (scope?: string) => any): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "updated", scope?: string): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

/**
 * Represents an aggregator/manager of a class of adapters
 */
export abstract class Supervisor<T extends AdapterStruct> extends Evented {
  adapters: T[] = [];
  state: AdapterState = AdapterState.READY;
  log = log.child({ name: "Supervisor" })

  register(adapter: T) {
    if (this.adapters.includes(adapter)) {
      throw new Error("Cannot register an adapter more than once.");
    }

    this.adapters.push(adapter.on("updated", this.updated.bind(this)));
  }

  updated(id?: string) {
    this.emit("updated", id);
  }

  async run() {
    await Promise.all(this.adapters.filter(adapter => (adapter.state === AdapterState.READY)).map(adapter => (adapter.run())));
    this.state = AdapterState.RUNNING;
  }

  abstract scopedData(scope: string, newSocket?: boolean): Promise<any>;
  abstract scopedDatas(): Promise<Record<string, any>>;
  abstract globalData(newSocket?: boolean): Promise<Record<string, Record<string, any>>>;
}