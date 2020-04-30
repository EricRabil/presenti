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
      if (process.env.NODE_ENV === "production") {
        if (!(username = process.env.DB_USERNAME!)) throw new Error("Please configure the database settings in your config.json or pass DB_USERNAME");
        hasChanges = true;
      } else {
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
    }

    if (password === null) {
      if (process.env.NODE_ENV === "production") {
        if (!(password = process.env.DB_PASSWORD!)) throw new Error("Please configure the database settings in your config.json or pass DB_PASSWORD");
        hasChanges = true;
      } else {
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
    }

    if (hasChanges) await saveConfig();
  }

  get config() {
    return CONFIG.db;
  }
}