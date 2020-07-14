import AuthClient from "@presenti/auth-client";
import logger from "@presenti/logging";
import connectToDatabase from "./database/connector";
import { PresenceService } from ".";
import { CONFIG } from "./utils/config";
import { Shell } from "./utils";

process.on("unhandledRejection", e => {
  logger.error("Unhandled process rejection.");
  console.log(e);
  logger.error(e);
});

const service = new PresenceService();

AuthClient.setup({
  host: CONFIG.auth.host,
  ajax: {
    port: CONFIG.auth.port
  }
});

const shell = new Shell({ service })

connectToDatabase().then(async () => {
  try {
    await service.run();
  } finally {
    logger.info('Service is running!');
    if (process.env.NODE_ENV !== "production") shell.run();
  }
});