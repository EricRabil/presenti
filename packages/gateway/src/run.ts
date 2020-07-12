import auth from "@presenti/auth-client";
import { DetachedPresenceGateway } from ".";

const AUTH_HOST = process.env.AUTH_HOST || '127.0.0.1';
const AUTH_PORT = process.env.AUTH_PORT || '8892';

auth.setup({
    host: AUTH_HOST,
    ajax: {
        port: AUTH_PORT
    }
});

const gateway = new DetachedPresenceGateway();
