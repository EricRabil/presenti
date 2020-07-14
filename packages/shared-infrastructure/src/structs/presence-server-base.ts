import IORedis, { Redis, RedisOptions } from "ioredis";
import { App, TemplatedApp } from "uWebSockets.js";
import logger from "@presenti/logging";
import { PresenceServer, PresentiAPIClient, PresenceList, OAuthModuleDefinition } from "@presenti/utils";
import { PresenceProvider, ModuleOptions, AdapterSupervisor, StateSupervisor, Module, Supervisor, oauthDefinitionsForModules } from "@presenti/modules";
import { PresenceCacheBuilder, StateCacheBuilder, ObjectCache, BaseCache, DistributedArray } from "@presenti/core-cache";
import { SharedPresentiAPIImplementation } from "./presenti-api";
import { RedisNotificationCenter } from "./notification-center";
import { PresentiAPI } from "@presenti/utils";

export interface ServiceOptions<T extends PresenceServer['config']> {
    name: string;
    redis: IORedis.Redis | IORedis.RedisOptions;
    config: T;
    app: TemplatedApp;
    database: ModuleOptions<any>['database'];
    modules: {
        [requireName: string]: object;
    };
};

function loadModule(name: string): typeof Module | null {
    if (name.startsWith("_")) return null;

    const log = logger.child({ name: "ModuleLoader" });

    try {
        var clazz = require(name);
    } catch (e) {
        log.warning(`Failed to load module '${name}'`, e);
        return null;
    }

    if (typeof clazz !== "function") {
        log.warning(`Invalid export for module '${name}'`);
        return null;
    }

    if (!((clazz as Function).prototype instanceof Module)) {
        log.warning(`Module '${name}' does not extend the Module class.`);
        return null;
    }

    return clazz;
}

export function createServer<T extends PresenceServer['config']>({ name, database, redis, config, app, modules }: Partial<ServiceOptions<T>>): Server<T> {
    name = name || `Server-${process.pid}`;
    redis = redis || { port: 6739, host: '127.0.0.1' };
    config = config || {
        web: {
            oauthSuccessRedirect: '/?success',
            host: 'presenti.me'
        },
        port: 8138
    } as any;
    app = app || App();
    modules = modules || {};
    database = database || {
        type: "postgres",
        host: "127.0.0.1",
        port: 5432
    };

    return new Server({ name, database, redis, config: config!, app, modules });
}

export class Server<T extends PresenceServer['config']> implements PresenceServer, PresenceProvider {
    app: TemplatedApp;
    log: typeof logger;
    config: T;

    redis: IORedis.Redis;
    redisEvents: IORedis.Redis;
    notificationCenter: RedisNotificationCenter;

    presenceSupervisor: AdapterSupervisor = new AdapterSupervisor();
    stateSupervisor: StateSupervisor = new StateSupervisor();

    presences: DistributedArray<PresenceList>;
    states: ObjectCache<Record<string, any>>;

    api: PresentiAPI;

    modules: Record<string, Module<any>> = {};
    database: ServiceOptions<any>['database'];

    constructor({ app, database, name, redis, config, modules }: ServiceOptions<T>) {
        this.config = config;
        this.log = logger.child({ name });
        this.app = app;
        this.database = database;

        if (typeof redis["prototype"] === "function") {
            this.redis = redis as Redis;
            this.redisEvents = new IORedis(this.redis.options);
        } else {
            this.redis = new IORedis(redis as RedisOptions);
            this.redisEvents = new IORedis(redis as RedisOptions);
        }

        this.presences = PresenceCacheBuilder(this.redis, this.redisEvents);
        this.states = StateCacheBuilder(this.redis, this.redisEvents);

        this.notificationCenter = new RedisNotificationCenter({ redis: this.redis, redisEvents: this.redisEvents });
        this.api = new SharedPresentiAPIImplementation({ notifications: this.notificationCenter });

        this.redisEvents.on("message", (channel, message) => {
            ObjectCache.receiveEvent(channel, message, [this.presences, this.states]);
            this.notificationCenter.receive(channel, message);
        });

        this.bindSupervisorToCache(this.presenceSupervisor, this.presences);
        this.bindSupervisorToCache(this.stateSupervisor, this.states);

        this.bindCleanupListeners();

        for (let [ name, config ] of Object.entries(modules)) {
            const clazz: any = loadModule(name);
            if (!clazz) continue;

            this.loadModule(clazz, config);
        }
    }

    get oauthDefinitions(): OAuthModuleDefinition[] {
        return oauthDefinitionsForModules(Object.values(this.modules));
    }

    /** Programatically load a module */
    loadModule(module: typeof Module, config: object = {}) {
        if (!(module.prototype instanceof Module)) throw new Error("Unable to load non-module.");

        this.modules[module.name] = new (module as any)(this.moduleOptionsWithConfig(config));

        return this;
    }

    bindSupervisorToCache(supervisor: Supervisor<any>, cache: BaseCache) {
        supervisor.on("updated", async scope => await cache.set(scope!, await supervisor.scopedData(scope!)));
    }

    bindCleanupListeners() {
        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`].forEach((ev: any) => process.on(ev, () => this.cleanup()));
    }

    /** Called when the process is going to exit. */
    cleaning = false;
    cleanup() {
        if (this.cleaning) return;
        this.cleaning = true;

        this.log.info('Cleaning up...');

        this.presences.beforeExit().then(() => {
            this.log.info('Thank you, and goodnight.');

            process.exit(0);
        });
    }

    async presence(scope: string): Promise<import("@presenti/utils").PresenceList> {
        return await this.presences.get(scope) || [];
    }

    async state(scope: string, initial?: boolean | undefined): Promise<Record<string, any>> {
        return await this.states.get(scope) || {};
    }

    async bootstrap(): Promise<void> {
        await Promise.all(Object.values(this.modules).map(m => m.run()));
        await this.presenceSupervisor.run();
        return await this.stateSupervisor.run();
    }

    async listen() {
        await this.bootstrap();

        this.app.listen('0.0.0.0', this.config.port, () => {
            this.log.info(`Listening for connections on :${this.config.port}`);
        });
    }

    moduleOptionsWithConfig<T extends object>(config: T): ModuleOptions<T> {
        return {
            app: this.app,
            provider: this,
            api: this.api,
            notifications: this.notificationCenter,
            config,
            database: this.database,
            supervisors: {
                presence: this.presenceSupervisor,
                state: this.stateSupervisor
            }
        }
    }
}