import { Client, Activity } from "discord.js";
import fs from "fs-extra";
import got from "got";
import path from "path";
import splashy from "splashy";
import { App, WebSocket } from "uWebSockets.js";
import { PresenceAdapter, AdapterState } from "./adapter";
import { SpotifyAdapter } from "./spotify";

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, "..", "config.json");
const scdn = (tag: string) => `https://i.scdn.co/image/${tag}`

const config = {
  token: "",
  user: "",
  spotifyCookies: "",
  port: 8138
};

if (!fs.pathExistsSync(CONFIG_PATH)) {
  fs.writeJSONSync(CONFIG_PATH, config, { spaces: 4 });
} else {
  Object.assign(config, fs.readJSONSync(CONFIG_PATH));
}

if (!config.token) {
  console.log('Please configure PresenceBot! No token was provided.');
  process.exit(1);
}

const bot = new Client();
bot.login(config.token).then(async () => {
  const app = App();

  const clients: WebSocket[] = [];
  const adapters: PresenceAdapter[] = [];

  // block for initializing adapters
  {
    if (config.spotifyCookies && config.spotifyCookies.length > 0) {
      adapters.push(new SpotifyAdapter(config.spotifyCookies));
    }
  }

  adapters.forEach(adapter => adapter.on("presence", broadcastPresence))

  let latestPresence = await computePresence(config.user);

  async function broadcastPresence() {
    latestPresence = await computePresence(config.user);
    await Promise.all(clients.map(c => c.send(JSON.stringify(latestPresence))));
  }

  app.ws('/presence', {
    open(ws, req) {
      clients.push(ws);
      ws.send(JSON.stringify(latestPresence));
    },
    close(ws, code, message) {
      clients.splice(clients.indexOf(ws), 1);
    },
    idleTimeout: 0
  });

  bot.on("presenceUpdate", async (oldP, newP) => {
    const id: string | null = newP.user?.id || newP.member?.id || (<any>newP)['userID'];
    if (!id) return;
    if (config.user !== id) return;
    await broadcastPresence();
  });

  function presenceForID(id: string) {
    if (config.user !== id) return null;
    const user = bot.users.resolve(id);
    if (!user) return null;
    return user.presence;
  }

  async function computePresence(id: string) {
    const presence = presenceForID(id);

    await Promise.all(adapters.filter(adapter => adapter.state === AdapterState.READY).map(adapter => adapter.run()));
    const activities: Array<Partial<Activity>> = (await Promise.all(adapters.filter(adapter => adapter.state === AdapterState.RUNNING).map(adapter => adapter.activity()))).filter(a => !!a) as any;

    return {
      userID: id,
      status: presence?.status || "offline",
      activities: (presence?.activities || []).map(a => ({
        ...a,
        assets: a.assets && {
          ...a.assets
        }
      })).filter(a => !activities.find(b => a.name === b.name)).concat(activities as Activity[])
    };
  };

  app.listen('0.0.0.0', config.port, () => {
    console.log(`Listening on ${config.port}`)
  })
});
