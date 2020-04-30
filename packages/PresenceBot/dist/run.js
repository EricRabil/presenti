"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const config_1 = require("./utils/config");
const logging_1 = require("./utils/logging");
const connector_1 = require("./database/connector");
const shell_1 = require("./utils/shell");
const entities = __importStar(require("./database/entities"));
const security_1 = require("./utils/security");
const adapter_supervisor_1 = require("./supervisors/adapter-supervisor");
const state_supervisor_1 = require("./supervisors/state-supervisor");
const entities_1 = require("./database/entities");
const socket_api_base_1 = require("./structs/socket-api-base");
const web_1 = require("./web");
process.on("unhandledRejection", e => {
    console.error(e);
});
const service = new _1.PresenceService(config_1.CONFIG.port, async (token) => security_1.SecurityKit.validateApiKey(token).then(user => {
    if (!user)
        return null;
    if (user instanceof entities_1.User) {
        return user.uuid;
    }
    else if (user === socket_api_base_1.FIRST_PARTY_SCOPE) {
        return user;
    }
    return null;
}));
console.clear();
const routes = web_1.WebRoutes.initialize(service.app);
const database = new connector_1.Database();
const shell = new shell_1.Shell({ service, SecurityKit: security_1.SecurityKit, adapterSupervisor: adapter_supervisor_1.SharedAdapterSupervisor, stateSupervisor: state_supervisor_1.SharedStateSupervisor, ...routes, database, ...entities, CONFIG: config_1.CONFIG });
database.connect().then(() => {
    service.run().then(() => {
        logging_1.log.info('Service is running!');
        if (process.env.NODE_ENV !== "production")
            shell.run();
    });
});
