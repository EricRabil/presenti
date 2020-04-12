import { Presence, PresenceStruct, PresentiPresenceStruct } from "./types";

export interface PresenceTransport {
  presence(presence: Presence[]): Promise<any>;
}

export class PresentiPresenceBuilder {
  public presence: PresentiPresenceStruct = {
    applicationID: null,
    assets: {
      largeImage: null,
      largeText: null,
      smallImage: null,
      smallText: null,
      smallTexts: []
    },
    createdTimestamp: 0,
    details: null,
    name: null,
    state: null,
    timestamps: {
      start: null,
      end: null
    },
    type: 'PLAYING',
    url: null,
    data: {
      largeTextLink: null,
      smallTextLink: null,
      smallTextLinks: [],
      imageLink: null
    }
  }

  toString() {
    return JSON.stringify(this.presence);
  }

  id(id: string | null) {
    this.presence.applicationID = id;
    return this;
  }

  largeImage(src: string | null, link: string | null = this.presence.data!.imageLink!) {
    this.presence.assets!.largeImage = src;
    this.presence.data!.imageLink = link;
    return this;
  }

  largeText(text: string | null, link: string | null = this.presence.data!.largeTextLink!) {
    this.presence.assets!.largeText = text;
    this.presence.data!.largeTextLink = link;
    return this;
  }

  text(text: string | null, link: string | null = null) {
    const index = this.presence.assets!.smallTexts!.push(text) - 1;
    this.presence.data!.smallTextLinks![index] = link;
    return this;
  }

  created(timestamp: number) {
    this.presence.createdTimestamp = timestamp;
    return this;
  }

  details(details: string | null) {
    this.presence.details = details;
    return this;
  }

  name(name: string | null) {
    this.presence.name = name;
    return this;
  }

  state(state: string | null) {
    this.presence.state = state;
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

  type(type: PresenceStruct['type']) {
    this.presence.type = type;
    return this;
  }
}