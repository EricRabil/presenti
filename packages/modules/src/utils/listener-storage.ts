import { NotificationCenter } from "../types";

/** Metadata on what event and property are being observed */
export interface ListenerArguments {
    property: string;
    event: string;
};

/** Observes notifications through the Listener decorator */
export class NotificationObserver {
    constructor(public notifications: NotificationCenter) {
        ListenerStorage.bind(this, notifications);
    }
}

export const ListenerStorage = new class {
    listeners: Map<Function, ListenerArguments[]> = new Map();

    put(target: Function, args: ListenerArguments) {
        if (!this.listeners.has(target)) this.listeners.set(target, []);

        this.listeners.get(target)!.push(args);
    }

    get(target: Function): ListenerArguments[] {
        return this.listeners.get(target) || [];
    }

    bind(observer: NotificationObserver, notifications: NotificationCenter) {
        const observed = this.get(observer.constructor);
        if (observed.length === 0) return;

        observed.forEach(({ property, event }) => notifications.addObserver(event, object => {
            observer[property](object);
        }));
    }
}
