import { PresenceService } from ".";
import Frontend from "./frontend";
import { CONFIG } from "./Configuration";
import { log } from "./utils";
import { Database } from "./database/connector";
import { Shell } from "./shell";
import * as entities from "./database/entities";
import { SecurityKit } from "./security";
import { SharedAdapterSupervisor } from "./supervisors/AdapterSupervisor";
import { SharedStateSupervisor } from "./supervisors/StateSupervisor";
import { User } from "./database/entities";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-adapter";

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

const frontend = new Frontend(service.app);
const database = new Database();
const shell = new Shell({ service, adapterSupervisor: SharedAdapterSupervisor, stateSupervisor: SharedStateSupervisor, frontend, database, ...entities, CONFIG });
database.connect().then(() => {
  service.run().then(() => {
    log.info('Service is running!');
    shell.run();
  });
});
