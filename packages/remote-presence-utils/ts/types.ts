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
  name: string;
  state: string | null;
  timestamps: {
    start: string | null;
    end: string | null;
  } | null;
  type: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'CUSTOM_STATUS';
  url: string | null;
  data?: any;
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
