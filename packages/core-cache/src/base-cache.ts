import IORedis from "ioredis";

export abstract class BaseCache<T = any> {
    listeners: Record<string, Function[]> = {};
    constructor(public readonly namespace: string, protected redis: IORedis.Redis, protected eventConnection?: IORedis.Redis) {}

    public static receiveEvent(channel: string, message: string, caches: BaseCache[]) {
        caches.forEach(c => c.onMessage(channel, message));
    }

    /** Asynchronously set one value */
    public abstract set(key: string, value: T): Promise<void>;
    /** Asynchronously updates a set of values in one execution */
    public abstract setBulk(values: Record<string, T>): Promise<number>;
    /** Asynchronously determine whether the cached value existsts */
    public abstract exists(key: string): Promise<boolean>;
    /** Asynchronously get the cached value */
    public abstract get(key: string): Promise<T | null>;
    /** Asynchronously clear the cached value */
    public abstract clear(key: string): Promise<void>;
    
    /** Subscribe to a key change */
    public async subscribe(key: string, handler: (value: string) => any) {
        if (!this.eventConnection) return;
        key = this.path(key);

        await this.eventConnection.subscribe(key);

        const handlers = this.listeners[key] || (this.listeners[key] = []);
        if (!handlers.includes(handler)) handlers.push(handler);
    }

    /** Unsubscribe from a key change */
    public async unsubscribe(key: string, handler?: (value: string) => any) {
        key = this.path(key);
        await this.redis.unsubscribe(key);
        
        if (!handler) return;
        const handlers = this.listeners[key];
        if (!handlers) return;
        if (handlers.includes(handler)) handlers.splice(handlers.indexOf(handler));
    }


    protected path(key: string) {
        return `${this.namespace}.${key}`;
    }

    /** Called when a subscribed channel is published to */
    public onMessage(channel: string, message: string) {
        if (this.listeners[channel]) {
            this.listeners[channel].forEach(l => l(message));
        }
    }
}