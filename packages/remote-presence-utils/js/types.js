"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AdapterState;
(function (AdapterState) {
    AdapterState[AdapterState["READY"] = 0] = "READY";
    AdapterState[AdapterState["RUNNING"] = 1] = "RUNNING";
})(AdapterState = exports.AdapterState || (exports.AdapterState = {}));
var PayloadType;
(function (PayloadType) {
    PayloadType[PayloadType["PING"] = 0] = "PING";
    PayloadType[PayloadType["PONG"] = 1] = "PONG";
    PayloadType[PayloadType["PRESENCE"] = 2] = "PRESENCE";
    PayloadType[PayloadType["IDENTIFY"] = 3] = "IDENTIFY";
    PayloadType[PayloadType["GREETINGS"] = 4] = "GREETINGS";
    PayloadType[PayloadType["PRESENCE_FIRST_PARTY"] = 5] = "PRESENCE_FIRST_PARTY";
})(PayloadType = exports.PayloadType || (exports.PayloadType = {}));
var API_ROUTES;
(function (API_ROUTES) {
    API_ROUTES["LINK_CODE"] = "/api/linkcode/validate";
    API_ROUTES["GENERATE_LINK_CODE"] = "/api/linkcode";
    API_ROUTES["API_KEY"] = "/api/apikey";
    API_ROUTES["DISCORD_AUTH"] = "/api/oauth/discord";
    API_ROUTES["DISCORD_AUTH_CALLBACK"] = "/api/oauth/discord/callback";
})(API_ROUTES = exports.API_ROUTES || (exports.API_ROUTES = {}));
function isRemotePayload(payload) {
    return "type" in payload;
}
exports.isRemotePayload = isRemotePayload;
