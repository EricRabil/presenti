"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const uWebSockets_js_1 = require("uWebSockets.js");
const adapter_1 = require("./adapter");
const spotify_1 = require("./spotify");
const CONFIG_PATH = process.env.CONFIG_PATH || path_1.default.resolve(__dirname, "..", "config.json");
const scdn = (tag) => `https://i.scdn.co/image/${tag}`;
const config = {
    token: "",
    user: "",
    spotifyCookies: "",
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
    const adapters = [];
    // block for initializing adapters
    {
        if (config.spotifyCookies && config.spotifyCookies.length > 0) {
            adapters.push(new spotify_1.SpotifyAdapter(config.spotifyCookies));
        }
    }
    adapters.forEach(adapter => adapter.on("presence", broadcastPresence));
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
        var _a, _b;
        const id = ((_a = newP.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = newP.member) === null || _b === void 0 ? void 0 : _b.id) || newP['userID'];
        if (!id)
            return;
        if (config.user !== id)
            return;
        await broadcastPresence();
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
        var _a, _b;
        const presence = presenceForID(id);
        await Promise.all(adapters.filter(adapter => adapter.state === adapter_1.AdapterState.READY).map(adapter => adapter.run()));
        const activities = (await Promise.all(adapters.filter(adapter => adapter.state === adapter_1.AdapterState.RUNNING).map(adapter => adapter.activity()))).filter(a => !!a);
        return {
            userID: id,
            status: ((_a = presence) === null || _a === void 0 ? void 0 : _a.status) || "offline",
            activities: (((_b = presence) === null || _b === void 0 ? void 0 : _b.activities) || []).map(a => ({
                ...a,
                assets: a.assets && {
                    ...a.assets
                }
            })).filter(a => !activities.find(b => a.name === b.name)).concat(activities)
        };
    }
    ;
    app.listen('0.0.0.0', config.port, () => {
        console.log(`Listening on ${config.port}`);
    });
});
