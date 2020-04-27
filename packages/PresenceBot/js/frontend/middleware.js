"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring_1 = __importDefault(require("querystring"));
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
        res.render('login', { error: 'You must be logged in to perform this action.' });
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
function uintToString(uintArray) {
    var encodedString = String.fromCharCode.apply(null, uintArray), decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
}
exports.BodyParser = async (req, res, next) => {
    const mime = req.getHeader('content-type');
    const data = req.body;
    console.log(data);
    switch (mime) {
        case 'application/x-www-form-urlencoded': {
            req.body = querystring_1.default.parse(data);
            break;
        }
        case 'application/json': {
            req.body = JSON.parse(data);
            break;
        }
    }
    next();
};
