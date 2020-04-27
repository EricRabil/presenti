import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { log as logger } from "./utils";

export interface ConfigurationStruct {
  presenti: {
    host: string | null;
    token: string | null;
    logging: boolean;
  };
  discord: {
    token: string;
    prefix: string;
  } | false,
  db: {
    host: string;
    port: number;
    name: string;
    username: string | null;
    password: string | null;
  };
}

const DEFAULT_CONFIG: ConfigurationStruct = {
  presenti: {
    host: null,
    token: null,
    logging: true
  },
  discord: false,
  db: {
    host: "127.0.0.1",
    port: 5432,
    name: "presenti-additions",
    username: null,
    password: null
  }
}

const log = logger.child({ name: "Configuration" });

export const CONFIG_PATH = path.resolve(__dirname, "..", "config.json");

export const CONFIG: ConfigurationStruct = fs.pathExistsSync(CONFIG_PATH) ? fs.readJsonSync(CONFIG_PATH) : (fs.writeJsonSync(CONFIG_PATH, DEFAULT_CONFIG, { spaces: 4 }), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));

export const saveConfig = () => fs.writeJson(CONFIG_PATH, CONFIG, { spaces: 4 }).then(() => log.info('Updated configuration file.'));