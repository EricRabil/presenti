"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const scoped_adapter_1 = require("../structs/scoped-adapter");
const supervisor_1 = require("../structs/supervisor");
const logging_1 = require("../utils/logging");
/**
 * Data namespace for Presence Data
 */
class AdapterSupervisor extends supervisor_1.Supervisor {
    constructor() {
        super();
        this.log = logging_1.log.child({ name: "AdapterSupervisor" });
        exports.SharedAdapterSupervisor = this;
    }
    async run() {
        await super.run();
    }
    scopedData(scope) {
        this.log.debug("Querying all adapters for presence data for scope", { scope });
        return Promise.all(this.adapters.filter(adapter => ((adapter.state === remote_presence_utils_1.AdapterState.RUNNING) && (adapter instanceof scoped_adapter_1.ScopedPresenceAdapter))).map(adapter => (adapter.activityForUser(scope)))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), []))).then(presences => ({ presences }));
    }
    async scopedDatas() {
        const activities = await Promise.all(this.adapters.filter(adapter => adapter instanceof scoped_adapter_1.ScopedPresenceAdapter).map((adapter) => adapter.activities()));
        return Object.entries(activities.reduce((acc, c) => {
            Object.entries(c).forEach(([scope, presences]) => {
                if (acc[scope])
                    acc[scope] = acc[scope].concat(presences);
                else
                    acc[scope] = presences;
            });
            return acc;
        }, {})).reduce((acc, [scope, presences]) => Object.assign(acc, { [scope]: { presences } }), {});
    }
    globalData() {
        return Promise.all(this.adapters.filter(adapter => (adapter.state === remote_presence_utils_1.AdapterState.RUNNING)).map(adapter => (!(adapter instanceof scoped_adapter_1.ScopedPresenceAdapter) ? adapter.activity() : []))).then(activities => (activities.filter(activity => (!!activity)).map(activity => (Array.isArray(activity) ? activity : [activity])).reduce((a, c) => a.concat(c), [])));
    }
}
exports.AdapterSupervisor = AdapterSupervisor;
