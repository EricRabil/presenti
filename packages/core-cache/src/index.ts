import { PresenceList } from "@presenti/utils";
import IORedis from "ioredis";
import { DistributedArray } from "./array-cache";
import { ObjectCache } from "./object-cache";

export * from "./array-cache";
export * from "./base-cache";
export * from "./object-cache";

export const PresenceCacheBuilder = (redis: IORedis.Redis, events?: IORedis.Redis) => new DistributedArray<PresenceList>('presence', redis, events);
export const StateCacheBuilder = (redis: IORedis.Redis, events?: IORedis.Redis) => new ObjectCache<Record<string, any>>('state', redis, events);
