import { Events, EventsTable } from "@presenti/utils";
import { EventEmitter } from "events";

export declare interface EventBus extends NodeJS.EventEmitter {
  addListener<T extends keyof EventsTable, D = EventsTable[T]>(event: T, listener: (data: D) => any): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;

  on<T extends keyof EventsTable, D = EventsTable[T]>(event: T, listener: (data: D) => any): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  once<T extends keyof EventsTable, D = EventsTable[T]>(event: T, listener: (data: D) => any): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;

  emit<T extends keyof EventsTable, D = EventsTable[T]>(event: T, data: D): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export const EventBus: EventBus = new EventEmitter();

EventBus.on(Events.OAUTH_UPDATE, console.log);