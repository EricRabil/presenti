import { PresenceAdapter, Presence } from "remote-presence-utils";
export declare interface ScopedPresenceAdapter {
    on(event: 'updated', listener: (id: string) => any): this;
    on(event: string, listener: Function): this;
    emit(event: 'updated', id: string): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}
export declare abstract class ScopedPresenceAdapter extends PresenceAdapter {
    abstract activityForUser(id: string): Promise<Presence>;
}
