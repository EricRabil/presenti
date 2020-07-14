import { Server, createServer, PresenceReadModule, PresenceWriteModule } from "@presenti/shared-infrastructure";
import { CONFIG } from "./utils";
import { WebRoutes } from "./web";

export var SharedPresenceService: Server<typeof CONFIG>;

export class PresenceService {
    server: Server<typeof CONFIG>;

    constructor() {
        this.server = createServer({
            database: {
                host: CONFIG.db.host,
                port: CONFIG.db.port,
                username: CONFIG.db.username || undefined,
                password: CONFIG.db.password || undefined,
                type: "postgres"
            },
            redis: CONFIG.cache,
            config: CONFIG,
            modules: CONFIG.modules
        });

        this.server.loadModule(PresenceReadModule).loadModule(PresenceWriteModule);

        WebRoutes.initialize(this.app);

        SharedPresenceService = this.server;
    }

    run() {
        return this.server.listen();
    }

    get redis() {
        return this.server.redis;
    }

    get redisEvents() {
        return this.server.redisEvents;
    }

    get app() {
        return this.server.app;
    }

    get oauthDefinitions() {
        return this.server.oauthDefinitions;
    }
}