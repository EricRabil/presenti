export enum AdapterState {
  READY, RUNNING
}

export type PresenceText = string | null | {
  text: string;
  link?: string | null;
}

export type PresenceImage = string | null | {
  src: string;
  link?: string | null;
}

export type PresenceTimeRange = {
  start: number | null;
  stop: number | null;
} | null;

export interface PresenceStruct {
  id?: string | null;
  title?: string;
  largeText?: PresenceText;
  smallTexts?: PresenceText[];
  image?: PresenceImage;
  timestamps?: PresenceTimeRange;
  gradient?: boolean | {
    // use this to take precedence over other gradients, otherwise 0
    priority?: number | null;
    enabled: boolean;
  } | null;
  shades?: string[];
  isPaused?: boolean | null;
}

export type Presence = Partial<PresenceStruct> | Array<Partial<PresenceStruct>> | undefined;


export interface RemoteAdapterOptions {
  
}

export interface RemotePayload {
  type: PayloadType;
  data?: any;
}

export interface RemotePresencePayload {
  type: PayloadType.PRESENCE;
  data: Presence[];
}

export interface FirstPartyPresenceData {
  scope: string;
  presence: Array<Partial<PresenceStruct> | undefined>;
}

export interface FirstPartyPresencePayload {
  type: PayloadType.PRESENCE_FIRST_PARTY;
  data: FirstPartyPresenceData;
}

export interface IdentifyPayload {
  type: PayloadType.IDENTIFY;
  data: string;
}

export interface PingPayload {
  type: PayloadType.PING;
}

export interface PongPayload {
  type: PayloadType.PONG;
}

export interface GreetingsPayload {
  type: PayloadType.GREETINGS;
}

export enum PayloadType {
  PING = 0, PONG = 1, PRESENCE = 2, IDENTIFY = 3, GREETINGS = 4, PRESENCE_FIRST_PARTY = 5
}

export function isRemotePayload(payload: any): payload is RemotePayload {
  return "type" in payload;
}