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
      end: null
    },
    data: {
      gradient: {
        priority: null,
        enabled: false
      }
    }
  }

  toString() {
    return JSON.stringify(this.presence);
  }

  largeText(text: string, link?: string | null) {
    this.presence.largeText = { text, link };
    return this;
  }

  smallText(text: string, link?: string | null) {
    this.presence.smallTexts!.push({ text, link });
    return this;
  }

  image(src: string | null, link?: string | null) {
    this.presence.image = src ? { src, link } : null;
    return this;
  }

  paused(state: boolean) {
    this.presence!.data!.isPaused = state;
    return this;
  }

  gradient(setting: boolean, priority?: number | null) {
    this.presence.data!.gradient = {
      enabled: setting,
      priority
    };
    return this;
  }

  title(title: string) {
    this.presence.title = title;
    return this;
  }
  
  start(time: Date | number | string) {
    if (time instanceof Date) time = time.toISOString()
    else if (typeof time === "number") time = new Date(time).toISOString()
    this.presence.timestamps!.start = time;
    return this;
  }

  end(time: Date | number | string) {
    if (time instanceof Date) time = time.toISOString()
    else if (typeof time === "number") time = new Date(time).toISOString()
    this.presence.timestamps!.end = time;
    return this;
  }
}