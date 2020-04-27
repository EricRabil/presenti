export declare enum AdapterState {
    READY = 0,
    RUNNING = 1
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
        priority?: number | null;
        enabled: boolean;
    } | null;
    shades?: string[];
    isPaused?: boolean | null;
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
