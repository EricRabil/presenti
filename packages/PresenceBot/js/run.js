"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const _1 = require(".");
const CONFIG_PATH = process.env.CONFIG_PATH || path_1.default.resolve(__dirname, "..", "config.json");
const config = {
    port: 8138,
    users: {}
};
if (!fs_extra_1.default.pathExistsSync(CONFIG_PATH)) {
    fs_extra_1.default.writeJSONSync(CONFIG_PATH, config, { spaces: 4 });
}
else {
    Object.assign(config, fs_extra_1.default.readJSONSync(CONFIG_PATH));
}
const service = new _1.PresenceService(config.port, async (id) => config.users[id]);
service.run().then(() => {
    console.log('Service is running!');
});
