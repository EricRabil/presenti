import { Presence, PresenceStruct } from "./types";

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

  largeText(text: string, link?: string | null) {
    this.presence.largeText = text ? { text, link } : null;
    return this;
  }

  smallText(text: string, link?: string | null) {
    if (!text) return this;
    
    this.presence.smallTexts!.push({ text, link });
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

  title(title: string) {
    this.presence.title = title;
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