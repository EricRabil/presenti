"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_extra_1 = __importDefault(require("fs-extra"));
const got_1 = __importDefault(require("got"));
const path_1 = __importDefault(require("path"));
const splashy_1 = __importDefault(require("splashy"));
const uWebSockets_js_1 = require("uWebSockets.js");
const CONFIG_PATH = process.env.CONFIG_PATH || path_1.default.resolve(__dirname, "..", "config.json");
const scdn = (tag) => `https://i.scdn.co/image/${tag}`;
const config = {
    token: "",
    user: "",
    port: 8138
};
if (!fs_extra_1.default.pathExistsSync(CONFIG_PATH)) {
    fs_extra_1.default.writeJSONSync(CONFIG_PATH, config, { spaces: 4 });
}
else {
    Object.assign(config, fs_extra_1.default.readJSONSync(CONFIG_PATH));
}
if (!config.token) {
    console.log('Please configure PresenceBot! No token was provided.');
    process.exit(1);
}
const bot = new discord_js_1.Client();
bot.login(config.token).then(async () => {
    const app = uWebSockets_js_1.App();
    const clients = [];
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
        var _a, _b;
        const id = ((_a = newP.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = newP.member) === null || _b === void 0 ? void 0 : _b.id) || newP['userID'];
        if (!id)
            return;
        if (config.user !== id)
            return;
        latestPresence = await computePresence(id);
        await Promise.all(clients.map(c => c.send(JSON.stringify(latestPresence))));
    });
    function presenceForID(id) {
        if (config.user !== id)
            return null;
        const user = bot.users.resolve(id);
        if (!user)
            return null;
        return user.presence;
    }
    async function computePresence(id) {
        var _a;
        const presence = presenceForID(id);
        if (!presence) {
            return null;
        }
        const spotifyAssets = presence.activities.filter(a => a.name === "Spotify")
            .map(a => a.assets)
            .filter(a => !!a)
            .map(a => Object.values(a))
            .map(a => a.filter(a => !!a)
            .map((t) => t.split(':'))
            .filter(([protocol]) => protocol === "spotify")
            .map(([, tag]) => ([tag, scdn(tag)])))
            .reduce((a, a1) => a.concat(a1), [])
            .map(([key, value]) => ({ key, url: value, palette: [] }));
        await Promise.all(spotifyAssets.map(async (asset) => {
            const body = await got_1.default(asset.url).buffer();
            const palette = await splashy_1.default(body);
            asset.palette.push(...palette);
        }));
        return {
            userID: (_a = presence.user) === null || _a === void 0 ? void 0 : _a.id,
            status: presence.status,
            activities: presence.activities.map(a => ({
                ...a,
                assets: a.assets && {
                    ...a.assets
                }
            })),
            spotifyAssets: spotifyAssets.reduce((a, { key, url, palette }) => ({ ...a, [key]: { url, palette } }), {})
        };
    }
    ;
    app.listen('0.0.0.0', config.port, () => {
        console.log(`Listening on ${config.port}`);
    });
});
