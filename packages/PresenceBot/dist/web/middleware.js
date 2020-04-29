"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../utils/config");
const socket_api_base_1 = require("../structs/socket-api-base");
/** Returns a 401 if the request is not authenticated */
exports.IdentityGuard = async (req, res, next) => {
    if (!res.user) {
        res.error("Invalid identity token.", 401);
        return next(true);
    }
    next();
};
/** Renders an authentication error if the request is not authenticated */
exports.IdentityGuardFrontend = async (req, res, next) => {
    if (!res.user) {
        res.render('login', { error: 'You must be logged in to perform this action.', signup: config_1.CONFIG.registration });
        return next(true);
    }
    next();
};
/** Blocks first-party requests to an endpoint */
exports.DenyFirstPartyGuard = async (req, res, next) => {
    if (res.user === socket_api_base_1.FIRST_PARTY_SCOPE) {
        res.writeStatus(403).json({ error: "First-parties may not call this endpoint." });
        return next(true);
    }
    next();
};
/** Only accepts first-party requests to an endpoint */
exports.FirstPartyGuard = async (req, res, next) => {
    if (res.user !== socket_api_base_1.FIRST_PARTY_SCOPE) {
        res.writeStatus(403).json({ error: "You are not authorized to use this endpoint." });
        return next(true);
    }
    next();
};
