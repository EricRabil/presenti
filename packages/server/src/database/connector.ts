import { createConnection } from "typeorm";
import { CONFIG, saveConfig } from "../utils/config";
import { ElasticSupervisor, User, OAuthLink } from "@presenti/shared-db";
import { Transformation } from "@presenti/client";

export default async function connectToDatabase() {
  let { host, port, name, username, password } = CONFIG.db;

  await createConnection({
    type: "postgres",
    host,
    port,
    database: name,
    entities: [
      __dirname + "/entities/*.js",
      User,
      OAuthLink,
      Transformation
    ],
    subscribers: [
      __dirname + "/subscribers/*.js"
    ],
    username: (username!),
    password: (password!),
    logging: CONFIG.db.logging,
    synchronize: true,
    cache: (typeof CONFIG.db.cache === "object" || CONFIG.db.cache === true) ? {
      type: "ioredis",
      alwaysEnabled: true,
      ...(typeof CONFIG.db.cache === "object" ? CONFIG.db.cache : {})
    } : false
  });
  return CONFIG.elasticSearch && ElasticSupervisor.init(CONFIG.elasticSearch).run();
}