import { Redis } from "ioredis";
import { NotificationCenter } from "@presenti/modules";
import log from "@presenti/logging";

export interface NotificationCenterOptions {
    redis: Redis;
    redisEvents: Redis;
}

/**
 * Redis pub/sub implementation of the NotificationCenter interface
 */
export class RedisNotificationCenter implements NotificationCenter {
    constructor(private options: NotificationCenterOptions) {}

    private listenersDict: Record<string, Function[]> = {};
    private log = log.child({ name: "RedisNotificationCenter" });

    async post(name: string, object: object, locally: boolean = false) {
        if (locally) return this.receive(name, this.receive(name, object));
        await this.redis.publish(name, JSON.stringify(object));
    }

    async addObserver(forName: string, handler: (object: any) => any) {
        if (!this.listeners(forName).includes(handler)) this.listeners(forName).push(handler);

        await this.redisEvents.subscribe(forName);
    }

    async removeObserver(forName: string, handler: (object: any) => any) {
        if (this.listeners(forName).includes(handler)) this.listeners(forName).splice(this.listeners(forName).indexOf(handler), 1);
        if (this.listeners(forName).length === 0) await this.redisEvents.unsubscribe(forName);
    }

    async receive(name: string, body: string | object) {
        try {
            var deserialized = typeof body === "object" ? body : JSON.parse(body);
        } catch (e) {
            this.log.error(`Failed to deserialize notification "${name}" with body:`, { body });
            return;
        }

        this.listeners(name).forEach(listener => listener(deserialized));
    }

    private listeners(forName: string) {
        if (!this.listenersDict[forName]) this.listenersDict[forName] = [];

        return this.listenersDict[forName];
    }

    private get redis() {
        return this.options.redis;
    }

    private get redisEvents() {
        return this.options.redisEvents;
    }
}