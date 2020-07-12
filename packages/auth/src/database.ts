import { CONFIG } from "./utils/config";
import { createConnection } from "typeorm";
import { User, OAuthLink, ElasticSupervisor } from "@presenti/shared-db";

export async function connect() {
  const { host, port, name, username, password } = CONFIG.db;

  return createConnection({
    type: "postgres",
    host,
    port,
    database: name,
    entities: [
      User,
      OAuthLink
    ],
    subscribers: [
      __dirname + "/subscribers/*.js"
    ],
    username: username!,
    password: password!,
    logging: CONFIG.db.logging,
    synchronize: false,
    cache: (typeof CONFIG.db.cache === "object" || CONFIG.db.cache === true) ? {
      type: "ioredis",
      alwaysEnabled: true,
      ...(typeof CONFIG.db.cache === "object" ? CONFIG.db.cache : {})
    } : false
  }).then(() => CONFIG.elasticSearch && ElasticSupervisor.init(CONFIG.elasticSearch).run());
}