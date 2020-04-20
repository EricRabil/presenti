import { Presence, PresenceStruct } from "./types";
export interface PresenceTransport {
    presence(presence: Presence[]): Promise<any>;
}
export declare class PresentiPresenceBuilder {
    presence: PresenceStruct;
    toString(): string;
    largeText(text: string, link?: string | null): this;
    smallText(text: string, link?: string | null): this;
    image(src: string, link?: string | null): this;
    paused(state: boolean): void;
    gradient(setting: boolean, priority?: number | null): void;
    start(time: Date | number | string): this;
    end(time: Date | number | string): this;
}
