import { TemplatedApp } from "uWebSockets.js";
import { PresenceProvider } from "./output";
import { AdapterSupervisor, StateSupervisor } from "../supervisors";
import { NativePresenceAdapter } from "./adapters/adapter";
import { StateAdapter } from "./adapters/state-adapter";
import { PresentiAPI } from "@presenti/utils";
import { NotificationCenter } from "../types";
import { NotificationObserver } from "../utils";
import { ConnectionOptions, Connection, createConnection, getConnection, ObjectType, BaseEntity } from "typeorm";
import logger from "@presenti/logging";

export interface ModuleOptions<T extends object> {
    app: TemplatedApp;
    provider: PresenceProvider;
    api: PresentiAPI;
    notifications: NotificationCenter;
    config: T;
    database: ConnectionOptions & { type: "postgres" };
    supervisors: {
        presence: AdapterSupervisor;
        state: StateSupervisor;
    }
}

export class Module<T extends object = any> extends NotificationObserver {
    log = logger.child({ name: this.constructor.name });

    constructor(public options: ModuleOptions<T>) {
        super(options.notifications);
    }

    run(): Promise<void> | void { }

    protected registerAdapter(adapter: NativePresenceAdapter) {
        if (adapter instanceof StateAdapter) {
            this.stateSupervisor.register(adapter);
        } else if (adapter instanceof NativePresenceAdapter) {
            this.presenceSupervisor.register(adapter);
        } else {
            throw Error("Invalid adapter failed to register.");
        }
    }

    protected async connectionForDatabase(name: string, entities: Array<ObjectType<BaseEntity>>) {
        const query = await getConnection().query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${name}'`)
        if (query.length === 0) await getConnection().query(`CREATE DATABASE "${name}"`);

        const connection = await createConnection({
            ...this.options.database,
            name,
            database: name,
            synchronize: true,
            entities
        });

        entities.forEach(entity => (entity as typeof BaseEntity).useConnection(connection));

        return connection;
    }

    protected get stateSupervisor() {
        return this.options.supervisors.state;
    }
    
    protected get presenceSupervisor() {
        return this.options.supervisors.presence;
    }

    protected get config() {
        return this.options.config;
    }

    protected get api() {
        return this.options.api;
    }

    protected get provider() {
        return this.options.provider;
    }

    protected get app() {
        return this.options.app;
    }
}