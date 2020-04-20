"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const discord_js_1 = require("discord.js");
class DiscordAdapter extends remote_presence_utils_1.PresenceAdapter {
    constructor(options) {
        super();
        this.options = options;
        this.state = remote_presence_utils_1.AdapterState.READY;
    }
    async run() {
        this.client = new discord_js_1.Client();
        await this.client.login(this.options.token);
        this.client.on("presenceUpdate", (_, presence) => {
            var _a, _b;
            const id = ((_a = presence.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = presence.member) === null || _b === void 0 ? void 0 : _b.id) || presence['userID'];
            if (!id)
                return;
            if (this.options.user !== id)
                return;
            this.emit("presence");
        });
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    get user() {
        return this.client.users.resolve(this.options.user);
    }
    async activity() {
        var _a;
        return ((_a = this.user) === null || _a === void 0 ? void 0 : _a.presence.activities.filter(activity => !this.options.overrides.includes(activity.name)).map(activity => {
            var _a, _b, _c, _d, _e, _f;
            return (new remote_presence_utils_1.PresenceBuilder()
                .title(activity.name)
                .largeText(activity.details || ((_a = activity.assets) === null || _a === void 0 ? void 0 : _a.largeText))
                .image(`https://cdn.discordapp.com/app-assets/${activity.applicationID}/${(_b = activity.assets) === null || _b === void 0 ? void 0 : _b.largeImage}.png`)
                .smallText(activity.state)
                .position((_d = (_c = activity.timestamps) === null || _c === void 0 ? void 0 : _c.start) === null || _d === void 0 ? void 0 : _d.getTime())
                .duration(((_f = (_e = activity.timestamps) === null || _e === void 0 ? void 0 : _e.end) === null || _f === void 0 ? void 0 : _f.getTime()) - Date.now())
                .presence);
        })) || [];
    }
}
exports.DiscordAdapter = DiscordAdapter;
