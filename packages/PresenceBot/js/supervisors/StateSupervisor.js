"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Supervisor_1 = require("../structs/Supervisor");
/**
 * Data namespace for Presence State
 */
class StateSupervisor extends Supervisor_1.Supervisor {
    async scopedData(scope, newSocket = false) {
        const state = await this.scopedState(scope, newSocket);
        return {
            state
        };
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
