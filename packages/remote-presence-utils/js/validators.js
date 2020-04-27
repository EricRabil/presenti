"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
function isPresencePayload(payload) {
    return payload.type === types_1.PayloadType.PRESENCE && "data" in payload;
}
exports.isPresencePayload = isPresencePayload;
function isFirstPartyPresencePayload(payload) {
    return payload.type === types_1.PayloadType.PRESENCE_FIRST_PARTY
        && "data" in payload
        && typeof payload.data.scope === "string"
        && "presence" in payload.data;
}
exports.isFirstPartyPresencePayload = isFirstPartyPresencePayload;
function isIdentifyPayload(payload) {
    return payload.type === types_1.PayloadType.IDENTIFY
        && typeof payload.data === "string";
}
exports.isIdentifyPayload = isIdentifyPayload;
function isPingPayload(payload) {
    return payload.type === types_1.PayloadType.PING;
}
exports.isPingPayload = isPingPayload;
function isPongPayload(payload) {
    return payload.type === types_1.PayloadType.PONG;
}
exports.isPongPayload = isPongPayload;
function isGreetingsPayload(payload) {
    return payload.type === types_1.PayloadType.GREETINGS;
}
exports.isGreetingsPayload = isGreetingsPayload;
exports.PayloadValidators = {
    [types_1.PayloadType.PRESENCE_FIRST_PARTY]: isFirstPartyPresencePayload,
    [types_1.PayloadType.PRESENCE]: isPresencePayload,
    [types_1.PayloadType.IDENTIFY]: isIdentifyPayload,
    [types_1.PayloadType.PING]: isPingPayload,
    [types_1.PayloadType.PONG]: isPongPayload,
    [types_1.PayloadType.GREETINGS]: isGreetingsPayload
};
