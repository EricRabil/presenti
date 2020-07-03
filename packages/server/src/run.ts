import log from "@presenti/logging";
import { SharedAdapterSupervisor, SharedStateSupervisor } from "@presenti/modules";
import { PresenceService } from ".";
import { Database } from "./database/connector";
import * as entities from "./database/entities";
import { User } from "./database/entities";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-base";
import { CONFIG } from "./utils/config";
import { loadModules } from "./utils/modules";
import { SecurityKit } from "./utils/security";
import { Shell } from "./utils/shell";
import { WebRoutes } from "./web";
import * as Constants from "./Constants";
import { TransformationsAPI } from "./api/transformations";

process.on("unhandledRejection", e => {
  console.error(e);
})

const service = new PresenceService(CONFIG.port, async token => SecurityKit.validateApiKey(token).then(user => {
  if (!user) return null;

  if (user instanceof User) {
    return user.uuid;
  } else if (user === FIRST_PARTY_SCOPE) {
    return user;
  }

  return null;
}));

const routes = WebRoutes.initialize(service.app);
const database = new Database();
const shell = new Shell({ service, SecurityKit, adapterSupervisor: SharedAdapterSupervisor, TransformationsAPI, stateSupervisor: SharedStateSupervisor, ...routes, database, ...entities, CONFIG, Constants });
loadModules().then(({ Adapters, Entities, Configs, Outputs, OAuth }) => {
  database.connect(Object.values(Entities)).then(async () => {
    try {
      service.run({ Adapters, Entities, Configs, Outputs, OAuth });
    } finally {
      log.info('Service is running!');
      if (process.env.NODE_ENV !== "production") shell.run();
    }
  });  
})