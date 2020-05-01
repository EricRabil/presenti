import events, { EventEmitter } from "events";
import { OAUTH_PLATFORM } from "@presenti/utils";
import { PresencePipe } from "./db/entities/Pipe";

export enum Events {
  PIPE_DESTROY,
  PIPE_CREATE
}

export type PipeEvent = PresencePipe;

interface EventsTable {
  [Events.PIPE_CREATE]: PipeEvent;
  [Events.PIPE_DESTROY]: PipeEvent;
}

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