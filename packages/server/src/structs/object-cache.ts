import { SharedPresenceService } from "..";
import IORedis from "ioredis";

export class ObjectCache<T = any> {
    constructor(public readonly namespace: string, private connection?: IORedis.Redis) {}

    public async set(key: string, value: T) {
        const serialized = JSON.stringify(value);
        await this.redis.hmset(this.namespace, key, serialized);
        await this.redis.publish(this.path(key), serialized);
    }

    public async setBulk(objects: Record<string, T>) {
        /** Redis will error if we send an empty set instruction, so return if its empty */
        if (Object.keys(objects).length === 0) return;

        var serialized: Record<string, string> = Object.entries(objects).reduce((acc, [key, value]) => Object.assign(acc, {[key]: JSON.stringify(value)}), {});
        await this.redis.hmset(this.namespace, serialized);
        
        const multi = Object.entries(serialized).reduce((acc, [key, value]) => acc.publish(this.path(key), value), this.redis.multi());
        await multi.exec();

        return Object.keys(objects).length;
    }

    public async exists(key: string): Promise<boolean> {
        return await this.redis.hexists(this.namespace, key).then(b => b === 1);
    }

    public async get(key: string): Promise<T | null> {
        const [ value ] = await this.redis.hmget(this.namespace, key);
        if (!value) return null;
        return JSON.parse(value);
    }

    public async subscribe(key: string, handler: (value: T) => any) {
        await this.redis.subscribe(this.path(key));

        this.redis.on(this.path(key), handler);
    }

    public async unsubscribe(key: string, handler?: (value: T) => any) {
        await this.redis.unsubscribe(this.path(key));

        if (handler) this.redis.off(this.path(key), handler);
    }

    get redis() {
        return this.connection || SharedPresenceService.redis;
    }

    private path(key: string) {
        return `${this.namespace}.${key}`;
    }
}