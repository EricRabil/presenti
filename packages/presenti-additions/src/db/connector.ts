import { CONFIG, saveConfig } from "../Configuration";
import inquirer from "inquirer";
import { createConnection } from "typeorm";

export class Database {
  async connect() {
    await this.ensureConfig();

    const { host, port, name: database, username, password } = this.config;

    return createConnection({
      type: "postgres",
      host,
      port,
      database,
      entities: [
        __dirname + "/entities/*.js"
      ],
      subscribers: [
        __dirname + "/subscribers/*.js"
      ],
      username: username!,
      password: password!,
      synchronize: true
    });
  }

  async ensureConfig() {
    const { host, port, username, password } = this.config;
    let hasChanges = false;

    if (!username) {
      this.config.username = await inquirer.prompt([
        {
          type: "input",
          name: "username",
          message: `What username will be used to connect to db '${host}:${port}'?`
        }
      ]).then(p => p.username);
      hasChanges = true;
    }

    if (password === null) {
      this.config.password = await inquirer.prompt([
        {
          type: "password",
          name: "password",
          message: `What password will be used to login to ${this.config.username}?`
        }
      ]).then(p => p.password);
      hasChanges = true;
    }

    if (hasChanges) {
      await saveConfig();
    }
  }

  get config() {
    return CONFIG.db;
  }
}