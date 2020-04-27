import inquirer from "inquirer";
import { createConnection } from "typeorm";
import { CONFIG, saveConfig } from "../Configuration";

export class Database {
  private hasChanges = false;

  async connect() {
    let { host, port, name, username, password } = this;

    if (username === null) {
      const { newUsername } = await inquirer.prompt([
        {
          type: "input",
          name: "newUsername",
          message: `What username will be used to connect to db '${host}:${port}'?`
        }
      ]);

      username = this.username = newUsername;
    }

    if (password === null) {
      const { newPassword } = await inquirer.prompt([
        {
          type: "password",
          name: "newPassword",
          message: `What is the password for the '${username}' user on the database?`
        }
      ]);

      password = this.password = newPassword;
    }

    if (this.hasChanges) await saveConfig().then(() => this.hasChanges = false);

    return createConnection({
      type: "postgres",
      host,
      port,
      database: name,
      entities: [
        __dirname + "/entities/*.js"
      ],
      username: username!,
      password: password!,
      synchronize: true,
      extra: {
        ssl: true
      },
      ssl: true
    })
  }

  get host() {
    return CONFIG.db.host;
  }

  set host(host) {
    CONFIG.db.host = host;
    this.hasChanges = true;
  }

  get port() {
    return CONFIG.db.port;
  }

  set port(port) {
    CONFIG.db.port = port;
    this.hasChanges = true;
  }

  get name() {
    return CONFIG.db.name;
  }

  set name(name) {
    CONFIG.db.name = name;
    this.hasChanges = true;
  }

  get username() {
    return CONFIG.db.username;
  }

  set username(username) {
    CONFIG.db.username = username;
    this.hasChanges = true;
  }

  get password() {
    return CONFIG.db.password;
  }

  set password(password) {
    CONFIG.db.password = password;
    this.hasChanges = true;
  }
}