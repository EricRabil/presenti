import { Presence, PresenceStruct } from "./types";
export interface PresenceTransport {
    presence(presence: Presence[]): Promise<any>;
}
export declare class PresenceBuilder {
    presence: PresenceStruct;
    toString(): string;
    largeText(text: string, link?: string | null): this;
    smallText(text: string, link?: string | null): this;
    image(src: string | null, link?: string | null): this;
    paused(state: boolean): this;
    gradient(setting: boolean, priority?: number | null): this;
    title(title: string): this;
    start(time: Date | number | string): this;
    end(time: Date | number | string): this;
}
