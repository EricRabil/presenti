"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("./logging");
const DEFAULT_CONFIG = {
    port: 8138,
    registration: false,
    discord: null,
    crypto: {
        jwtSecret: null,
        firstPartyKey: null
    },
    web: {
        host: "://localhost:8138"
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: +process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'presenti',
        username: process.env.DB_USERNAME || null,
        password: process.env.DB_PASSWORD || null
    }
};
exports.CONFIG_PATH = path_1.default.resolve(__dirname, "..", "..", "config.json");
exports.CONFIG = fs_extra_1.default.pathExistsSync(exports.CONFIG_PATH) ? fs_extra_1.default.readJsonSync(exports.CONFIG_PATH) : (fs_extra_1.default.writeJsonSync(exports.CONFIG_PATH, DEFAULT_CONFIG, { spaces: 4 }), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
exports.saveConfig = () => fs_extra_1.default.writeJson(exports.CONFIG_PATH, exports.CONFIG, { spaces: 4 }).then(() => logging_1.log.info('Updated configuration file'));
