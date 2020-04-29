"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const typeorm_1 = require("typeorm");
const config_1 = require("../utils/config");
class Database {
    async connect() {
        let { host, port, name, username, password } = this.config;
        await this.ensureConfig();
        return typeorm_1.createConnection({
            type: "postgres",
            host,
            port,
            database: name,
            entities: [
                __dirname + "/entities/*.js"
            ],
            subscribers: [
                __dirname + "/subscribers/*.js"
            ],
            username: username,
            password: password,
            synchronize: true
        });
    }
    async ensureConfig() {
        let { host, port, name, username, password } = this.config;
        let hasChanges = false;
        if (username === null) {
            const { newUsername } = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "newUsername",
                    message: `What username will be used to connect to db '${host}:${port}'?`
                }
            ]);
            username = this.config.username = newUsername;
            hasChanges = true;
        }
        if (password === null) {
            const { newPassword } = await inquirer_1.default.prompt([
                {
                    type: "password",
                    name: "newPassword",
                    message: `What is the password for the '${username}' user on the database?`
                }
            ]);
            password = this.config.password = newPassword;
            hasChanges = true;
        }
        if (hasChanges)
            await config_1.saveConfig();
    }
    get config() {
        return config_1.CONFIG.db;
    }
}
exports.Database = Database;
