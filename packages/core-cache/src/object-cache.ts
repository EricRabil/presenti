import IORedis from "ioredis";
import { inspect } from "util";
import { BaseCache } from "./base-cache";

export class ObjectCache<T = any> extends BaseCache {
    
    /** Asynchronously set one value */
    public async set(key: string, value: T) {
        const serialized = JSON.stringify(value);
        
        await this.redis.hmset(this.namespace, key, serialized);
        await this.redis.publish(this.path(key), serialized);
    }

    /** Asynchronously updates a set of values in one execution */
    public async setBulk(objects: Record<string, T>) {
        /** Redis will error if we send an empty set instruction, so return if its empty */
        if (Object.keys(objects).length === 0) return 0;

        var serialized: Record<string, string> = Object.entries(objects).reduce((acc, [key, value]) => Object.assign(acc, {[key]: JSON.stringify(value)}), {});
        await this.redis.hmset(this.namespace, serialized);
        
        const multi = Object.entries(serialized).reduce((acc, [key, value]) => acc.publish(this.path(key), value), this.redis.multi());
        await multi.exec();

        return Object.keys(objects).length;
    }

    /** Asynchronously determine whether the cached value existsts */
    public async exists(key: string): Promise<boolean> {
        return await this.redis.hexists(this.namespace, key).then(b => b === 1);
    }

    /** Asynchronously get the cached value */
    public async get(key: string): Promise<T | null> {
        const [ value ] = await this.redis.hmget(this.namespace, key);
        if (!value) return null;
        return JSON.parse(value);
    }

    public async clear(key: string): Promise<void> {
        await this.redis.hdel(this.namespace, key);
    }
}