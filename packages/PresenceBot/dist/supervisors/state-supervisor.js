"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supervisor_1 = require("../structs/supervisor");
/**
 * Data namespace for Presence State
 */
class StateSupervisor extends supervisor_1.Supervisor {
    constructor() {
        super();
        exports.SharedStateSupervisor = this;
    }
    async scopedData(scope, newSocket = false) {
        const state = await this.scopedState(scope, newSocket);
        return {
            state
        };
    }
    async scopedDatas() {
        const states = await Promise.all(this.adapters.map(adapter => adapter.datas()));
        return Object.entries(states.reduce((acc, c) => {
            Object.entries(c).forEach(([scope, state]) => {
                if (acc[scope])
                    acc[scope] = Object.assign(acc[scope], state);
                else
                    acc[scope] = state;
                return acc;
            });
            return acc;
        }, {})).reduce((acc, [scope, presences]) => Object.assign(acc, { [scope]: presences }), {});
    }
    async globalData(newSocket = false) {
        return {};
    }
    async scopedState(scope, newSocket = false) {
        const resolvedStates = await Promise.all(this.adapters.map(adapter => adapter.data(scope, newSocket)));
        return resolvedStates.reduce((acc, cur) => Object.assign(acc, cur), {});
    }
}
exports.StateSupervisor = StateSupervisor;
