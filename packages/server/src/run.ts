import { PresenceService } from ".";
import Frontend from "./web/frontend";
import { CONFIG } from "./utils/config";
import { log } from "./utils/logging";
import { Database } from "./database/connector";
import { Shell } from "./utils/shell";
import * as entities from "./database/entities";
import { SecurityKit } from "./utils/security";
import { SharedAdapterSupervisor } from "./supervisors/adapter-supervisor";
import { SharedStateSupervisor } from "./supervisors/state-supervisor";
import { User } from "./database/entities";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-base";
import { WebRoutes } from "./web";

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
console.clear();

const routes = WebRoutes.initialize(service.app);
const database = new Database();
const shell = new Shell({ service, SecurityKit, adapterSupervisor: SharedAdapterSupervisor, stateSupervisor: SharedStateSupervisor, ...routes, database, ...entities, CONFIG });
database.connect().then(() => {
  service.run().then(() => {
    log.info('Service is running!');
    if (process.env.NODE_ENV !== "production") shell.run();
  });
});
