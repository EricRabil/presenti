"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const events_1 = require("events");
const scoped_adapter_1 = require("./scoped-adapter");
class AdapterSupervisor extends events_1.EventEmitter {
    constructor(app) {
        super();
        this.app = app;
        this.adapters = [];
    }
    register(adapter) {
        if (this.adapters.includes(adapter)) {
            throw new Error("Cannot register an adapter more than once.");
        }
        this.adapters.push(adapter instanceof scoped_adapter_1.ScopedPresenceAdapter
            ? adapter.on("presence", this.updated.bind(this))
            : adapter.on("presence", () => this.updated()));
    }
    async updated(id) {
        this.emit("updated", {
            $selector: id
        });
    }
    initialize() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.READY)).map(adapter => (adapter.run())));
    }
    scopedActivities(id) {
        return Promise.all(this.adapters.filter(adapter => ((adapter.state === remote_presence_utils_1.AdapterState.RUNNING) && (adapter instanceof scoped_adapter_1.ScopedPresenceAdapter))).map(adapter => (adapter.activityForUser(id)))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), [])));
    }
    globalActivities() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.RUNNING)).map(adapter => (!(adapter instanceof scoped_adapter_1.ScopedPresenceAdapter) ? adapter.activity() : []))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), [])));
    }
}
exports.AdapterSupervisor = AdapterSupervisor;
