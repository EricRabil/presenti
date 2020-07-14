"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_infrastructure_1 = require("@presenti/shared-infrastructure");
const auth_client_1 = __importDefault(require("@presenti/auth-client"));
const port = +process.env.PRESENTI_GATEWAY_PORT || 9283;
const redis = {
    port: +process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1'
};
auth_client_1.default.setup({
    host: process.env.AUTH_HOST || '127.0.0.1',
    ajax: {
        port: process.env.AUTH_PORT || '8892'
    }
});
const server = shared_infrastructure_1.createServer({
    redis,
    name: "Gateway",
    config: {
        web: null,
        port
    }
});
server.loadModule(shared_infrastructure_1.PresenceReadModule).loadModule(shared_infrastructure_1.PresenceWriteModule);
server.listen();
