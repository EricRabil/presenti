"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Supervisor_1 = require("./structs/Supervisor");
/**
 * Aggregates events from all supervisors and funnels them through this class
 */
class MasterSupervisor extends Supervisor_1.Supervisor {
    async scopedData(scope, newSocket = false) {
        const resolvedData = await Promise.all(this.adapters.map(adapter => adapter.scopedData(scope, newSocket)));
        return resolvedData.reduce((acc, cur) => Object.assign(acc, cur), {});
    }
    async globalData(newSocket = false) {
        const resolvedData = await Promise.all(this.adapters.map(adapter => adapter.globalData(newSocket)));
        return resolvedData.reduce((acc, cur) => Object.assign(acc, cur), {});
    }
}
exports.MasterSupervisor = MasterSupervisor;
