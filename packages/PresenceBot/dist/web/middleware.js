"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../utils/config");
const socket_api_base_1 = require("../structs/socket-api-base");
exports.IdentityGuard = async (req, res, next) => {
    if (!res.user) {
        res.writeStatus(401).json({ e: 401, msg: "Invalid identity token." });
        return next(true);
    }
    next();
};
exports.IdentityGuardFrontend = async (req, res, next) => {
    if (!res.user) {
        res.render('login', { error: 'You must be logged in to perform this action.', signup: config_1.CONFIG.registration });
        return next(true);
    }
    next();
};
exports.DenyFirstPartyGuard = async (req, res, next) => {
    if (res.user === socket_api_base_1.FIRST_PARTY_SCOPE) {
        res.writeStatus(403).json({ error: "First-parties may not call this endpoint." });
        return next(true);
    }
    next();
};
exports.FirstPartyGuard = async (req, res, next) => {
    if (res.user !== socket_api_base_1.FIRST_PARTY_SCOPE) {
        res.writeStatus(403).json({ error: "You are not authorized to use this endpoint." });
        return next(true);
    }
    next();
};
