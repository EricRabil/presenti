"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const typeorm_1 = require("typeorm");
const Configuration_1 = require("../Configuration");
class Database {
    constructor() {
        this.hasChanges = false;
    }
    async connect() {
        let { host, port, name, username, password } = this;
        if (username === null) {
            const { newUsername } = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "newUsername",
                    message: `What username will be used to connect to db '${host}:${port}'?`
                }
            ]);
            username = this.username = newUsername;
        }
        if (password === null) {
            const { newPassword } = await inquirer_1.default.prompt([
                {
                    type: "password",
                    name: "newPassword",
                    message: `What is the password for the '${username}' user on the database?`
                }
            ]);
            password = this.password = newPassword;
        }
        if (this.hasChanges)
            await Configuration_1.saveConfig().then(() => this.hasChanges = false);
        return typeorm_1.createConnection({
            type: "postgres",
            host,
            port,
            database: name,
            entities: [
                __dirname + "/entities/*.js"
            ],
            username: username,
            password: password,
            synchronize: true,
            extra: {
                ssl: true
            },
            ssl: true
        });
    }
    get host() {
        return Configuration_1.CONFIG.db.host;
    }
    set host(host) {
        Configuration_1.CONFIG.db.host = host;
        this.hasChanges = true;
    }
    get port() {
        return Configuration_1.CONFIG.db.port;
    }
    set port(port) {
        Configuration_1.CONFIG.db.port = port;
        this.hasChanges = true;
    }
    get name() {
        return Configuration_1.CONFIG.db.name;
    }
    set name(name) {
        Configuration_1.CONFIG.db.name = name;
        this.hasChanges = true;
    }
    get username() {
        return Configuration_1.CONFIG.db.username;
    }
    set username(username) {
        Configuration_1.CONFIG.db.username = username;
        this.hasChanges = true;
    }
    get password() {
        return Configuration_1.CONFIG.db.password;
    }
    set password(password) {
        Configuration_1.CONFIG.db.password = password;
        this.hasChanges = true;
    }
}
exports.Database = Database;
