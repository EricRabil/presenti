export declare enum AdapterState {
    READY = 0,
    RUNNING = 1
}
export interface LegacyPresenceStruct {
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
export declare type PresenceText = string | null | {
    text: string;
    link?: string | null;
};
export declare type PresenceImage = string | null | {
    src: string;
    link?: string | null;
};
export declare type PresenceTimeRange = {
    start: string | null;
    end: string | null;
} | null;
export declare enum MediaState {
    PLAYING = 0,
    PAUSED = 1
}
export interface PresenceStruct {
    title?: string;
    largeText?: PresenceText;
    smallTexts?: PresenceText[];
    image?: PresenceImage;
    timestamps?: PresenceTimeRange;
    data?: {
        gradient?: boolean | {
            priority?: number | null;
            enabled: boolean;
        } | null;
        isPaused?: boolean | null;
    } | null;
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
