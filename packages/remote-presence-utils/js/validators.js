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
function isPresentiText(obj) {
    if (typeof obj === "string" || obj === null)
        return true;
    if (typeof obj !== "object")
        return false;
    const keys = ["text", "link"];
    const objKeys = Object.keys(obj);
    const fastInvalid = objKeys.find(key => !keys.includes(key));
    if (fastInvalid)
        return false;
    if (typeof obj.text !== "string")
        return false;
    if (obj.link && !(typeof obj.link === "string" || obj.link === null))
        return false;
    return true;
}
exports.isPresentiText = isPresentiText;
function isPresentiImage(obj) {
    if (typeof obj !== "object")
        return false;
    if (obj === null)
        return true;
    const keys = ["src", "link"];
    const objKeys = Object.keys(obj);
    const fastInvalid = objKeys.find(key => !keys.includes(key));
    if (fastInvalid)
        return false;
    if (typeof obj.text !== "string")
        return false;
    if (typeof obj.link !== "string" && obj.link !== null)
        return false;
    return true;
}
exports.isPresentiImage = isPresentiImage;
function isPresentiTimeRange(obj) {
    if (typeof obj !== "object")
        return false;
    if (obj === null)
        return true;
    const keys = ["start", "stop"];
    const objKeys = Object.keys(obj);
    const fastInvalid = objKeys.find(key => !keys.includes(key));
    if (fastInvalid)
        return false;
    if (typeof obj.start !== "number" && obj.start !== null)
        return false;
    if (typeof obj.stop !== "number" && obj.stop !== null)
        return false;
    return true;
}
exports.isPresentiTimeRange = isPresentiTimeRange;
function isPresentiStruct(obj) {
    const keys = ["id", "title", "largeText", "smallTexts", "image", "timestamps", "gradient", "shades", "isPaused"];
    const objKeys = Object.keys(keys);
    const fastInvalid = objKeys.find(key => !keys.includes(key));
    if (fastInvalid)
        return false;
    for (let key of objKeys) {
        switch (key) {
            case "id":
                if (typeof obj.id === "string" || obj.id === null)
                    continue;
                return false;
            case "title":
                if (typeof obj.title === "string" || obj.title === null)
                    continue;
                return false;
            case "largeText":
                if (isPresentiText(obj.largeText))
                    continue;
                return false;
            case "smallTexts":
                if (obj.smallTexts === null)
                    continue;
                if (Array.isArray(obj.smallTexts) && obj.smallTexts.every((text) => isPresentiText(text)))
                    continue;
                return false;
            case "image":
                if (obj.image === null)
                    continue;
                if (isPresentiImage(obj.image))
                    continue;
                return false;
            case "timestamps":
                if (obj.timestamps === null)
                    continue;
                if (isPresentiTimeRange(obj.timestamps))
                    continue;
                return false;
            case "gradient":
                if (obj.gradient === null)
                    continue;
                if (typeof obj.gradient === "boolean")
                    continue;
                if (typeof obj.gradient === "object" && (typeof obj.gradient.enabled === "boolean" && (obj.gradient.priority ? (typeof obj.gradient.priority === "number" || obj.gradient.priority === null) : true)))
                    continue;
                return false;
            case "shades":
                if (obj.shades === null)
                    continue;
                if (Array.isArray(obj.shades) && obj.shades.every((shade) => typeof shade === "string"))
                    continue;
                return false;
            case "isPaused":
                if (obj.isPaused === null)
                    continue;
                if (typeof obj.isPaused === "boolean")
                    continue;
                return false;
            default:
                return false;
        }
    }
    return true;
}
exports.isPresentiStruct = isPresentiStruct;
exports.PayloadValidators = {
    [types_1.PayloadType.PRESENCE_FIRST_PARTY]: isFirstPartyPresencePayload,
    [types_1.PayloadType.PRESENCE]: isPresencePayload,
    [types_1.PayloadType.IDENTIFY]: isIdentifyPayload,
    [types_1.PayloadType.PING]: isPingPayload,
    [types_1.PayloadType.PONG]: isPongPayload,
    [types_1.PayloadType.GREETINGS]: isGreetingsPayload
};
