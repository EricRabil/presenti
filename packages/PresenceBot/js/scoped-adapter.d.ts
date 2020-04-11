import { PresenceAdapter, Presence } from "./adapter";
export declare interface ScopedPresenceAdapter {
    on(event: 'presence', listener: (id: string) => any): this;
    on(event: string, listener: Function): this;
    emit(event: 'presence', id: string): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}
export declare abstract class ScopedPresenceAdapter extends PresenceAdapter {
    abstract activityForUser(id: string): Promise<Presence>;
}
