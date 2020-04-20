"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AdapterState;
(function (AdapterState) {
    AdapterState[AdapterState["READY"] = 0] = "READY";
    AdapterState[AdapterState["RUNNING"] = 1] = "RUNNING";
})(AdapterState = exports.AdapterState || (exports.AdapterState = {}));
var MediaState;
(function (MediaState) {
    MediaState[MediaState["PLAYING"] = 0] = "PLAYING";
    MediaState[MediaState["PAUSED"] = 1] = "PAUSED";
})(MediaState = exports.MediaState || (exports.MediaState = {}));
var PayloadType;
(function (PayloadType) {
    PayloadType[PayloadType["PING"] = 0] = "PING";
    PayloadType[PayloadType["PONG"] = 1] = "PONG";
    PayloadType[PayloadType["PRESENCE"] = 2] = "PRESENCE";
    PayloadType[PayloadType["IDENTIFY"] = 3] = "IDENTIFY";
    PayloadType[PayloadType["GREETINGS"] = 4] = "GREETINGS";
})(PayloadType = exports.PayloadType || (exports.PayloadType = {}));
function isRemotePayload(payload) {
    return "type" in payload;
}
exports.isRemotePayload = isRemotePayload;
