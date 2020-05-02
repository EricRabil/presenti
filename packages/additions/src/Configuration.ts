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
  spotifyInternal: {
    key: string | null;
  };
  discord: {
    token: string;
    prefix: string;
  } | false,
  db: {
    host: string;
    port: number;
    database: string;
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
  spotifyInternal: {
    key: null
  },
  discord: false,
  db: {
    host: "127.0.0.1",
    port: 5432,
    database: "presenti-additions",
    username: null,
    password: null
  }
}

const log = logger.child({ name: "Configuration" });

export const CONFIG_PATH = path.resolve(__dirname, "..", "config.json");

export const CONFIG: ConfigurationStruct = fs.pathExistsSync(CONFIG_PATH) ? fs.readJsonSync(CONFIG_PATH) : (fs.writeJsonSync(CONFIG_PATH, DEFAULT_CONFIG, { spaces: 4 }), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
if (process.env.DB_HOST) CONFIG.db.host = process.env.DB_HOST;
if (process.env.DB_PORT) CONFIG.db.port = +process.env.DB_PORT;
if (process.env.DB_NAME) CONFIG.db.database = process.env.DB_NAME;
if (process.env.DB_USERNAME) CONFIG.db.username = process.env.DB_USERNAME;
if (process.env.DB_PASSWORD) CONFIG.db.password = process.env.DB_PASSWORD;
if (process.env.PRESENTI_TOKEN) CONFIG.presenti.token = process.env.PRESENTI_TOKEN;
if (process.env.PRESENTI_HOST) CONFIG.presenti.host = process.env.PRESENTI_HOST;

export const saveConfig = () => fs.writeJson(CONFIG_PATH, CONFIG, { spaces: 4 }).then(() => log.info('Updated configuration file.'));