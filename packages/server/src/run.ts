import log from "@presenti/logging";
import { SharedAdapterSupervisor, SharedStateSupervisor } from "@presenti/modules";
import { PresenceService } from ".";
import { Database } from "./database/connector";
import * as entities from "./database/entities";
import { User } from "@presenti/shared-db";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";
import { CONFIG, saveConfig } from "./utils/config";
import { loadModules } from "@presenti/modules";
import { Shell } from "./utils/shell";
import { DebugKit } from "./utils/debug";
import { WebRoutes } from "./web";
import * as Constants from "./Constants";
import { Mailer } from "./utils/mailer";
import { TransformationsAPI } from "./api/transformations";
import AuthClient from "@presenti/auth-client";

process.on("unhandledRejection", e => {
  log.error("Unhandled process rejection.");
  console.log(e);
  log.error(e);
});

const service = new PresenceService(CONFIG.port, async token => AuthClient.sharedInstance.validateApiKey(token).then(({ user, firstParty }) => {
  if (user) return user.uuid;
  if (firstParty) return FIRST_PARTY_SCOPE;
  return null;
}));

AuthClient.setup({
  host: CONFIG.auth.host,
  ajax: {
    port: CONFIG.auth.port
  }
});

const routes = WebRoutes.initialize(service.app);
const database = new Database();

const shell = new Shell({ service, AuthClient, DebugKit, adapterSupervisor: SharedAdapterSupervisor, TransformationsAPI, stateSupervisor: SharedStateSupervisor, Mailer, ...routes, database, ...entities, CONFIG, Constants });

loadModules({ config: CONFIG, saveConfig }).then(({ Adapters, Entities, Configs, Outputs, OAuth }) => {
  database.connect(Object.values(Entities)).then(async () => {
    try {
      service.run({ Adapters, Entities, Configs, Outputs, OAuth });
    } finally {
      log.info('Service is running!');
      if (process.env.NODE_ENV !== "production") shell.run();
    }
  });  
});