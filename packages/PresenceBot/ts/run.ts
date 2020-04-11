import fs from "fs-extra";
import path from "path";
import { PresenceService } from ".";

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, "..", "config.json");

const config = {
  port: 8138,
  users: {} as Record<string, string>
};

if (!fs.pathExistsSync(CONFIG_PATH)) {
  fs.writeJSONSync(CONFIG_PATH, config, { spaces: 4 });
} else {
  Object.assign(config, fs.readJSONSync(CONFIG_PATH));
}

const service = new PresenceService(config.port, async id => config.users[id]);
service.run().then(() => {
  console.log('Service is running!');
});