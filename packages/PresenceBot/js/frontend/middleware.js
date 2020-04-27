"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Configuration_1 = require("../Configuration");
const security_1 = require("../security");
const socket_api_adapter_1 = require("../structs/socket-api-adapter");
exports.IdentityGuard = async (req, res, next) => {
    if (!res.user) {
        res.writeStatus(401).json({ e: 401, msg: "Invalid identity token." });
        return next(true);
    }
    next();
};
exports.IdentityGuardFrontend = async (req, res, next) => {
    if (!res.user) {
        res.render('login', { error: 'You must be logged in to perform this action.', signup: Configuration_1.CONFIG.registration });
        return next(true);
    }
    next();
};
exports.FirstPartyGuard = async (req, res, next) => {
    const authorization = req.getHeader('authorization');
    if (!authorization || (await security_1.SecurityKit.validateApiKey(authorization)) !== socket_api_adapter_1.FIRST_PARTY_SCOPE) {
        res.writeStatus(403).json({ msg: "You are not authorized to access this endpoint." });
        return next(true);
    }
    next();
};
