import { Client } from "discord.js";
import fs from "fs-extra";
import got from "got";
import path from "path";
import splashy from "splashy";
import { App, WebSocket } from "uWebSockets.js";

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, "..", "config.json");
const scdn = (tag: string) => `https://i.scdn.co/image/${tag}`

const config = {
  token: "",
  user: "",
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
  let latestPresence = await computePresence(config.user);

  app.ws('/presence', {
    open(ws, req) {
      clients.push(ws);
      ws.send(JSON.stringify(latestPresence));
    },
    close(ws, code, message) {
      clients.splice(clients.indexOf(ws), 1);
    }
  });

  bot.on("presenceUpdate", async (oldP, newP) => {
    const id: string | null = newP.user?.id || newP.member?.id || (<any>newP)['userID'];
    if (!id) return;
    if (config.user !== id) return;
    latestPresence = await computePresence(id);
    await Promise.all(clients.map(c => c.send(JSON.stringify(latestPresence))));
  });

  function presenceForID(id: string) {
    if (config.user !== id) return null;
    const user = bot.users.resolve(id);
    if (!user) return null;
    return user.presence;
  }

  async function computePresence(id: string) {
    const presence = presenceForID(id);

    if (!presence) {
      return null;
    }

    const spotifyAssets =
    presence.activities.filter(a => a.name === "Spotify")
            .map(a => a.assets)
            .filter(a => !!a)
            .map(a => Object.values(a!))
            .map(a => a.filter(a => !!a)
                       .map((t: string) => t.split(':'))
                       .filter(([protocol]) => protocol === "spotify")
                       .map(([, tag]) => ([ tag, scdn(tag) ])))
            .reduce((a, a1) => a.concat(a1), [])
            .map(([key, value]) => ({ key, url: value, palette: [] as string[] }));

    await Promise.all(spotifyAssets.map(async (asset) => {
      const body = await got(asset.url).buffer();
      const palette = await splashy(body);
      asset.palette.push(...palette);
    }));

    return {
      userID: presence.user?.id,
      status: presence.status,
      activities: presence.activities.map(a => ({
        ...a,
        assets: a.assets && {
          ...a.assets
        }
      })),
      spotifyAssets: spotifyAssets.reduce((a, { key, url, palette }) => ({...a, [key]: {url, palette}}), {})
    };
  };

  app.listen('0.0.0.0', config.port, () => {
    console.log(`Listening on ${config.port}`)
  })
});
