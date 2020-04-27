"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const frontend_1 = __importDefault(require("./frontend"));
const Configuration_1 = require("./Configuration");
const utils_1 = require("./utils");
const connector_1 = require("./database/connector");
const shell_1 = require("./shell");
const entities = __importStar(require("./database/entities"));
const security_1 = require("./security");
const AdapterSupervisor_1 = require("./supervisors/AdapterSupervisor");
const StateSupervisor_1 = require("./supervisors/StateSupervisor");
const entities_1 = require("./database/entities");
const socket_api_adapter_1 = require("./structs/socket-api-adapter");
process.on("unhandledRejection", e => {
    console.error(e);
});
const service = new _1.PresenceService(Configuration_1.CONFIG.port, async (token) => security_1.SecurityKit.validateApiKey(token).then(user => {
    if (!user)
        return null;
    if (user instanceof entities_1.User) {
        return user.uuid;
    }
    else if (user === socket_api_adapter_1.FIRST_PARTY_SCOPE) {
        return user;
    }
    return null;
}));
console.clear();
const frontend = new frontend_1.default(service.app);
const database = new connector_1.Database();
const shell = new shell_1.Shell({ service, adapterSupervisor: AdapterSupervisor_1.SharedAdapterSupervisor, stateSupervisor: StateSupervisor_1.SharedStateSupervisor, frontend, database, ...entities, CONFIG: Configuration_1.CONFIG });
database.connect().then(() => {
    service.run().then(() => {
        utils_1.log.info('Service is running!');
        shell.run();
    });
});
