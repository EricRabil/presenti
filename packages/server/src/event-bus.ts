import events, { EventEmitter } from "events";
import { User } from "./database/entities";
import { OAUTH_PLATFORM } from "@presenti/utils";
import { PresenceList } from "./utils/presence-magic";

export enum Events {
  OAUTH_UPDATE,
  USER_CREATE,
  USER_UPDATE,
  PRESENCE_UPDATE,
  STATE_UPDATE
}

export interface OAuthEvent {
  user: User;
  /** New array of OAuth connections */
  platforms: Record<OAUTH_PLATFORM, string>;
}

export interface UserEvent {
  /** User entity representing the user */
  user: User;
}

export interface PresenceUpdateEvent {
  /** This will be a string of the userID when the user was never queried. */
  user: User | string;
  /** Did a first party update the presence? */
  firstParty: boolean;
  /** Updated presence data for the user */
  presence: PresenceList;
}

export interface StateUpdateEvent {
  user: User | string;
  state: Record<string, any>;
}

interface EventsTable {
  [Events.OAUTH_UPDATE]: OAuthEvent;
  [Events.PRESENCE_UPDATE]: PresenceUpdateEvent;
  [Events.STATE_UPDATE]: StateUpdateEvent;
  [Events.USER_CREATE]: UserEvent;
  [Events.USER_UPDATE]: UserEvent;
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

EventBus.on(Events.OAUTH_UPDATE, console.log);