import { Presence, PresenceStruct, PresentiPresenceStruct } from "./types";
export interface PresenceTransport {
    presence(presence: Presence[]): Promise<any>;
}
export declare class PresentiPresenceBuilder {
    presence: PresentiPresenceStruct;
    toString(): string;
    id(id: string | null): this;
    largeImage(src: string | null, link?: string | null): this;
    largeText(text: string | null, link?: string | null): this;
    text(text: string | null, link?: string | null): this;
    created(timestamp: number): this;
    details(details: string | null): this;
    name(name: string | null): this;
    state(state: string | null): this;
    start(time: Date | number | string): this;
    end(time: Date | number | string): this;
    type(type: PresenceStruct['type']): this;
}
