import { Presence, PresenceStruct, PresenceText } from "../types";

export interface PresenceTransport {
  presence(presence: Presence[]): Promise<any>;
}

export class PresenceBuilder {
  public presence: PresenceStruct = {
    title: null!,
    largeText: null,
    smallTexts: [],
    image: null,
    timestamps: {
      start: null,
      effective: Date.now(),
      stop: null
    },
    gradient: {
      priority: null,
      enabled: false
    },
    isPaused: null,
    id: null,
  }

  toString() {
    return JSON.stringify(this.presence);
  }

  largeText(text: PresenceText): PresenceBuilder
  largeText(text: string, link?: string | null): PresenceBuilder
  largeText(text: PresenceText | string, link?: string | null): PresenceBuilder {
    this.presence.largeText = typeof text === "object" ? text : { text, link };
    return this;
  }

  smallText(text: PresenceText): PresenceBuilder
  smallText(text: string, link?: string | null): PresenceBuilder
  smallText(text: PresenceText | string, link?: string | null): PresenceBuilder {
    if (!text) return this;
    this.presence.smallTexts!.push(typeof text === "object" ? text : { text, link });
    return this;
  }

  image(src: string | null, link?: string | null) {
    this.presence.image = src ? { src, link } : null;
    return this;
  }

  paused(state: boolean) {
    this.presence.isPaused = state;
    return this;
  }

  gradient(setting: boolean, priority?: number | null) {
    this.presence.gradient = setting ? {
      enabled: setting,
      priority
    } : null;
    return this;
  }

  title(title: PresenceText): PresenceBuilder
  title(text: string, link?: string | null): PresenceBuilder
  title(title: PresenceText | string | null, link?: string | null): PresenceBuilder {
    this.presence.title = typeof title === "object" ? title : { text: title, link };
    return this;
  }
  
  start(start: number | null) {
    this.presence.timestamps!.start = start;
    return this;
  }

  stop(stop: number | null) {
    this.presence.timestamps!.stop = stop;
    return this;
  }

  id(id: string | null) {
    this.presence.id = id;
    return this;
  }
}