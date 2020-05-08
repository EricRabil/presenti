import fs from "fs-extra";
import path from "path";
import log from "@presenti/logging";

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
    cache?: boolean | {
      type: "ioredis",
    };
  };
  modules: Record<string, object | boolean>;
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
    host: process.env.DB_HOST || 'localhost',
    port: +process.env.DB_PORT! || 5432,
    name: process.env.DB_NAME || 'presenti',
    username: process.env.DB_USERNAME || null,
    password: process.env.DB_PASSWORD || null,
    cache: false
  },
  modules: {}
}

export const CONFIG_PATH = path.resolve(__dirname, "..", "..", "config.json");

export const CONFIG: ConfigurationStruct = fs.pathExistsSync(CONFIG_PATH) ? fs.readJsonSync(CONFIG_PATH) : (fs.writeJsonSync(CONFIG_PATH, DEFAULT_CONFIG, { spaces: 4 }), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
if (process.env.DB_HOST) CONFIG.db.host = process.env.DB_HOST;
if (process.env.DB_PORT) CONFIG.db.port = +process.env.DB_PORT;
if (process.env.DB_NAME) CONFIG.db.name = process.env.DB_NAME;
if (process.env.DB_USERNAME) CONFIG.db.username = process.env.DB_USERNAME;
if (process.env.DB_PASSWORD) CONFIG.db.password = process.env.DB_PASSWORD;

export const saveConfig = () => fs.writeJson(CONFIG_PATH, CONFIG, { spaces: 4 }).then(() => log.info('Updated configuration file'));