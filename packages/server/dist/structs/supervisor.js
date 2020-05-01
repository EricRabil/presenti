"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../utils/logging");
const remote_presence_utils_1 = require("remote-presence-utils");
/**
 * Represents an aggregator/manager of a class of adapters
 */
class Supervisor extends remote_presence_utils_1.Evented {
    constructor() {
        super(...arguments);
        this.adapters = [];
        this.state = remote_presence_utils_1.AdapterState.READY;
        this.log = logging_1.log.child({ name: "Supervisor" });
    }
    register(adapter) {
        if (this.adapters.includes(adapter)) {
            throw new Error("Cannot register an adapter more than once.");
        }
        this.adapters.push(adapter.on("updated", this.updated.bind(this)));
    }
    updated(id) {
        this.emit("updated", id);
    }
    async run() {
        await Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.READY)).map(adapter => (adapter.run())));
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
}
exports.Supervisor = Supervisor;
