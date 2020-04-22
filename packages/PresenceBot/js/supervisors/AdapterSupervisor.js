"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const scoped_adapter_1 = require("../structs/scoped-adapter");
const Supervisor_1 = require("../structs/Supervisor");
/**
 * Data namespace for Presence Data
 */
class AdapterSupervisor extends Supervisor_1.Supervisor {
    constructor(app) {
        super();
        this.app = app;
        this.shades = {};
        exports.SharedAdapterSupervisor = this;
    }
    scopedData(scope) {
        return Promise.all(this.adapters.filter(adapter => ((adapter.state === remote_presence_utils_1.AdapterState.RUNNING) && (adapter instanceof scoped_adapter_1.ScopedPresenceAdapter))).map(adapter => (adapter.activityForUser(scope)))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), []))).then(presences => ({ presences }));
    }
    globalData() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.RUNNING)).map(adapter => (!(adapter instanceof scoped_adapter_1.ScopedPresenceAdapter) ? adapter.activity() : []))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), [])));
    }
}
exports.AdapterSupervisor = AdapterSupervisor;
