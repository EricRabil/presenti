"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_1 = require("../adapter");
const discord_js_1 = require("discord.js");
class DiscordAdapter extends adapter_1.PresenceAdapter {
    constructor(options) {
        super();
        this.options = options;
        this.state = adapter_1.AdapterState.READY;
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
        this.state = adapter_1.AdapterState.RUNNING;
    }
    get user() {
        return this.client.users.resolve(this.options.user);
    }
    async activity() {
        var _a;
        return (_a = this.user) === null || _a === void 0 ? void 0 : _a.presence.activities.filter(activity => !this.options.overrides.includes(activity.name));
    }
}
exports.DiscordAdapter = DiscordAdapter;
