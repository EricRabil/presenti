"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const remote_presence_utils_1 = require("remote-presence-utils");
/** Node.JS-only adapter that uses the native events library */
class NativePresenceAdapter extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.state = remote_presence_utils_1.AdapterState.READY;
    }
}
exports.NativePresenceAdapter = NativePresenceAdapter;
