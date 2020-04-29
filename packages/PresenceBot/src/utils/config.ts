import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { log } from "./logging";

export interface ConfigurationStruct {
  port: number;
  registration: boolean;
  crypto: {
    jwtSecret: string | null;
    firstPartyKey: string | null;
  },
  discord: {
    clientID: string;
    clientSecret: string;
  } | null,
  web: {
    host: string;
  };
  db: {
    host: string;
    port: number;
    name: string;
    username: string | null;
    password: string | null;
  }
}

const DEFAULT_CONFIG: ConfigurationStruct = {
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
    host: 'localhost',
    port: 5432,
    name: 'presenti',
    username: null,
    password: null
  }
}

export const CONFIG_PATH = path.resolve(__dirname, "..", "..", "config.json");

export const CONFIG: ConfigurationStruct = fs.pathExistsSync(CONFIG_PATH) ? fs.readJsonSync(CONFIG_PATH) : (fs.writeJsonSync(CONFIG_PATH, DEFAULT_CONFIG, { spaces: 4 }), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));

export const saveConfig = () => fs.writeJson(CONFIG_PATH, CONFIG, { spaces: 4 }).then(() => log.info('Updated configuration file'));