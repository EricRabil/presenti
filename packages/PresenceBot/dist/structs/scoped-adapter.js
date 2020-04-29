"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_1 = require("./adapter");
class ScopedPresenceAdapter extends adapter_1.NativePresenceAdapter {
    /**
     * It doesn't make sense to return a mono-array of all presences for scoped adapters, so this should return an empty array.
     */
    activity() {
        return [];
    }
}
exports.ScopedPresenceAdapter = ScopedPresenceAdapter;
