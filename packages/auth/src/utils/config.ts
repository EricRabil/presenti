import log from "@presenti/logging";
import path from "path";
import fs from "fs-extra";

export interface ConfigurationStruct {
    crypto: {
        jwtSecret: string | null;
        firstPartyKey: string | null;
    };
    db: {
        host: string;
        port: number;
        name: string;
        username: string | null;
        password: string | null;
        cache?: any;
        logging?: boolean;
    };
    elasticSearch?: import("@elastic/elasticsearch").ClientOptions;
    web: {
      port: number;
    };
};

const DEFAULT_CONFIG: ConfigurationStruct = {
    crypto: {
        jwtSecret: null,
        firstPartyKey: null
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: +process.env.DB_PORT! || 5432,
        name: process.env.DB_NAME || 'presenti',
        username: process.env.DB_USERNAME || null,
        password: process.env.DB_PASSWORD || null,
        cache: process.env.REDIS_HOST ? {
          options: {
            host: process.env.REDIS_HOST
          }
        } : false,
        logging: false
    },
    elasticSearch: {
      node: process.env.ELASTIC_NODE || 'http://127.0.0.1:9200'
    },
    web: {
      port: +process.env.WEB_PORT! || 8892
    }
};

export const CONFIG_PATH = path.resolve(__dirname, "..", "..", "config.json");

export const CONFIG: ConfigurationStruct = fs.pathExistsSync(CONFIG_PATH) ? fs.readJsonSync(CONFIG_PATH) : (fs.writeJsonSync(CONFIG_PATH, DEFAULT_CONFIG, { spaces: 4 }), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
if (process.env.JWT_SECRET) CONFIG.crypto.jwtSecret = process.env.JWT_SECRET;
if (process.env.FIRST_PARTY_KEY) CONFIG.crypto.firstPartyKey = process.env.FIRST_PARTY_KEY;
if (process.env.DB_HOST) CONFIG.db.host = process.env.DB_HOST;
if (process.env.DB_PORT) CONFIG.db.port = +process.env.DB_PORT;
if (process.env.DB_NAME) CONFIG.db.name = process.env.DB_NAME;
if (process.env.DB_USERNAME) CONFIG.db.username = process.env.DB_USERNAME;
if (process.env.DB_PASSWORD) CONFIG.db.password = process.env.DB_PASSWORD;
if (process.env.REDIS_HOST) CONFIG.db.cache = {
    options: {
      host: process.env.REDIS_HOST
    }
};
if (process.env.ELASTIC_NODE) CONFIG.elasticSearch = {
    ...(CONFIG.elasticSearch || {}),
    node: process.env.ELASTIC_NODE
};

export const saveConfig = () => fs.writeJson(CONFIG_PATH, CONFIG, { spaces: 4 }).then(() => log.info('Updated configuration file'));
