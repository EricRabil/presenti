export declare enum AdapterState {
    READY = 0,
    RUNNING = 1
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
export declare type Presence = Partial<PresenceStruct> | Array<Partial<PresenceStruct>> | undefined;
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
export declare enum PayloadType {
    PING = 0,
    PONG = 1,
    PRESENCE = 2,
    IDENTIFY = 3,
    GREETINGS = 4
}
export declare function isRemotePayload(payload: any): payload is RemotePayload;
export interface PresenceUpdateEvent {
    $selector: string;
}
