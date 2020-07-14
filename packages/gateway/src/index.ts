import { createServer, PresenceReadModule, PresenceWriteModule } from "@presenti/shared-infrastructure";
import AuthClient from "@presenti/auth-client";

const port = +process.env.PRESENTI_GATEWAY_PORT! || 9283;
const redis = {
    port: +process.env.REDIS_PORT! || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1'
};

AuthClient.setup({
    host: process.env.AUTH_HOST || '127.0.0.1',
    ajax: {
        port: process.env.AUTH_PORT! || '8892'
    }
});

const server = createServer({
    redis,
    name: "Gateway",
    config: {
        web: null as any,
        port
    }
});

server.loadModule(PresenceReadModule).loadModule(PresenceWriteModule);

server.listen();
