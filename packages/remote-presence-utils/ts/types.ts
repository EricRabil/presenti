export enum AdapterState {
  READY, RUNNING
}

export interface PresenceStruct {
  applicationID: string | null;
  assets: {
    largeImage: string | null;
    largeText: string | null;
    smallImage: string | null;
    smallText: string | null;
  } | null;
  createdTimestamp: number;
  details: string | null;
  name: string | null;
  state: string | null;
  timestamps: {
    start: string | null;
    end: string | null;
  } | null;
  type: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'CUSTOM_STATUS';
  url: string | null;
  data?: {
    [key: string]: any;
  };
}

export interface PresentiPresenceStruct extends PresenceStruct {
  assets: {
    largeImage: string | null;
    largeText: string | null;
    smallImage: null;
    smallText: null;
    smallTexts: (string | null)[];
  } | null;
  url: null;
  data?: {
    largeTextLink?: string | null;
    smallTextLink?: null;
    smallTextLinks?: (string | null)[];
    imageLink?: string | null;
  };
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

export enum PayloadType {
  PING, PONG, PRESENCE, IDENTIFY, GREETINGS
}

export function isRemotePayload(payload: any): payload is RemotePayload {
  return "type" in payload;
}

export interface PresenceUpdateEvent {
  $selector: string;
}
