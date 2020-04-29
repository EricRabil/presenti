import inquirer from "inquirer";
import { createConnection } from "typeorm";
import { CONFIG, saveConfig } from "../utils/config";

export class Database {
  async connect() {
    let { host, port, name, username, password } = this.config;

    await this.ensureConfig();

    return createConnection({
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
      username: username!,
      password: password!,
      synchronize: true
    })
  }

  async ensureConfig() {
    let { host, port, name, username, password } = this.config;

    let hasChanges = false;
    if (username === null) {
      const { newUsername } = await inquirer.prompt([
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
      const { newPassword } = await inquirer.prompt([
        {
          type: "password",
          name: "newPassword",
          message: `What is the password for the '${username}' user on the database?`
        }
      ]);

      password = this.config.password = newPassword;
      hasChanges = true;
    }

    if (hasChanges) await saveConfig();
  }

  get config() {
    return CONFIG.db;
  }
}