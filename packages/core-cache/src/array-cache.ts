import { BaseCache } from "./base-cache";

export class DistributedArray<T extends Array<any> = any[]> extends BaseCache {
    trackedKeys: Record<string, boolean> = {};

    public async set(key: string, value: T): Promise<void> {
        const serialized = JSON.stringify(value);

        const [ , [ , values ] ] = await this.redis.multi()
                        .hmset(this.path(key), this.keyname, serialized)
                        .hgetall(this.path(key))
                        .exec();

        this.trackedKeys[key] = true;

        await this.redis.publish(this.path(key), JSON.stringify(Object.values(values as Record<string, string>).flatMap((v) => JSON.parse(v)) as T));
    }

    public async setBulk(values: Record<string, T>): Promise<number> {
        if (Object.keys(values).length === 0) return 0;

        let multi = this.redis.multi();

        const serialized = Object.entries(values).map(([key, value]) => [(this.trackedKeys[key] = true, this.path(key)), JSON.stringify(value)]);
        serialized.forEach(([key, value]) => multi.hmset(key, this.keyname, value));

        const readStart = serialized.length;

        serialized.forEach(([key]) => multi.hgetall(key));

        /** gets the updated array partials */
        const results: [string, Record<string, string>][] = (await multi.exec())
                                                                        /** skip the OK messages for the first half, which are the hmset results */
                                                                        .slice(readStart)
                                                                        /** flatmap and slice the [error, result] be result */
                                                                        .flatMap(v => v.slice(1))
                                                                        /** take results and pair them with their keys */
                                                                        .map((result, idx) => [serialized[idx][0], result as Record<string, string>]);

        multi = this.redis.multi();

        /** publishes stitched arrays to each channel */
        results.forEach(([key, values]) => multi.publish(this.path(key), JSON.stringify(Object.values(values as Record<string, string>).flatMap((v) => JSON.parse(v)) as T)));

        await multi.exec();

        return serialized.length;
    }

    public async exists(key: string): Promise<boolean> {
        const b = await this.redis.hexists(this.path(key), this.keyname);
        return b === 1;
    }

    public async get(key: string): Promise<T> {
        const values = await this.redis.hgetall(this.path(key));
        return Object.values(values).flatMap(v => JSON.parse(v)) as T;
    }

    public async getLocal(key: string): Promise<T> {
        return JSON.parse(await this.redis.hget(this.path(key), this.keyname) || '[]') as T;
    }

    public async clear(key: string): Promise<void> {
        await this.redis.hdel(this.path(key), this.keyname);
        delete this.trackedKeys[key];
    }

    public beforeExit(multi = this.redis.multi()) {
        Object.keys(this.trackedKeys).forEach(key => multi.hdel(this.path(key), this.keyname));

        return multi;
    }

    private get keyname(): string {
        return process.pid.toString();
    }
}
