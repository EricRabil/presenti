"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
var AdapterState;
(function (AdapterState) {
    AdapterState[AdapterState["READY"] = 0] = "READY";
    AdapterState[AdapterState["RUNNING"] = 1] = "RUNNING";
})(AdapterState = exports.AdapterState || (exports.AdapterState = {}));
class PresenceAdapter extends events_1.EventEmitter {
}
exports.PresenceAdapter = PresenceAdapter;
