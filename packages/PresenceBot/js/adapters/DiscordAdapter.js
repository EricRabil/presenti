"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const remote_presence_utils_1 = require("remote-presence-utils");
const discord_js_1 = require("discord.js");
class DiscordAdapter extends remote_presence_utils_1.PresenceAdapter {
    constructor(options) {
        super();
        this.options = options;
        this.iconRegistry = {};
        this.state = remote_presence_utils_1.AdapterState.READY;
    }
    async run() {
        this.client = new discord_js_1.Client();
        const data = await got_1.default("https://gist.github.com/EricRabil/b8c959c0abfe0c5628c31ca85ac985dd/raw/").json();
        data.forEach(map => this.iconRegistry[map.id] = map);
        await this.client.login(this.options.token);
        this.client.on("presenceUpdate", (_, presence) => {
            var _a, _b;
            const id = ((_a = presence.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = presence.member) === null || _b === void 0 ? void 0 : _b.id) || presence['userID'];
            if (!id)
                return;
            if (this.options.user !== id)
                return;
            this.emit("updated");
        });
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    get user() {
        return this.client.users.resolve(this.options.user);
    }
    async activity() {
        var _a;
        return ((_a = this.user) === null || _a === void 0 ? void 0 : _a.presence.activities.filter(activity => !this.options.overrides.includes(activity.name)).map(activity => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return (new remote_presence_utils_1.PresenceBuilder()
                .title(activity.name)
                .largeText(activity.details || ((_a = activity.assets) === null || _a === void 0 ? void 0 : _a.largeText))
                .image((((_b = activity.assets) === null || _b === void 0 ? void 0 : _b.largeImage) || ((_c = activity.assets) === null || _c === void 0 ? void 0 : _c.smallImage)) ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${((_d = activity.assets) === null || _d === void 0 ? void 0 : _d.largeImage) || ((_e = activity.assets) === null || _e === void 0 ? void 0 : _e.smallImage)}.png` : `https://cdn.discordapp.com/app-icons/${activity.applicationID}/${this.iconRegistry[activity.applicationID].icon}.webp?size=256&keep_aspect_ratio=false`)
                .smallText(activity.state)
                .start((_g = (_f = activity.timestamps) === null || _f === void 0 ? void 0 : _f.start) === null || _g === void 0 ? void 0 : _g.getTime())
                .stop((_j = (_h = activity.timestamps) === null || _h === void 0 ? void 0 : _h.end) === null || _j === void 0 ? void 0 : _j.getTime())
                .presence);
        })) || [];
    }
}
exports.DiscordAdapter = DiscordAdapter;
