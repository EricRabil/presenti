"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_client_1 = __importDefault(require("@presenti/auth-client"));
const _1 = require(".");
const AUTH_HOST = process.env.AUTH_HOST || '127.0.0.1';
const AUTH_PORT = process.env.AUTH_PORT || '8892';
auth_client_1.default.setup({
    host: AUTH_HOST,
    ajax: {
        port: AUTH_PORT
    }
});
const gateway = new _1.DetachedPresenceGateway();
