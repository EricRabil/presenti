"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
class ScopedPresenceAdapter extends remote_presence_utils_1.PresenceAdapter {
    /**
     * It doesn't make sense to return a mono-array of all presences for scoped adapters.
     */
    activity() {
        return [];
    }
}
exports.ScopedPresenceAdapter = ScopedPresenceAdapter;
