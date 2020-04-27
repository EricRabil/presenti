"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const remote_presence_utils_1 = require("remote-presence-utils");
const discord_js_1 = require("discord.js");
const StorageAdapter_1 = require("./internal/StorageAdapter");
const entities_1 = require("../database/entities");
const utils_1 = require("../utils");
const DEFAULT_STORAGE = {
    scopeBindings: {}
};
/**
 * This cannot be piped remotely.
 */
class DiscordAdapter extends StorageAdapter_1.StorageAdapter {
    constructor(options) {
        super("com.ericrabil.discord", DEFAULT_STORAGE);
        this.options = options;
        this.iconRegistry = {};
        this.log = utils_1.log.child({ name: "DiscordAdapter" });
        this.linkLocks = {};
        this.linkLockWarns = {};
        this.state = remote_presence_utils_1.AdapterState.READY;
    }
    async run() {
        this.log.debug("Connecting to Discord...");
        this.client = new discord_js_1.Client();
        let ready = new Promise(resolve => this.client.once("ready", resolve));
        const data = await got_1.default("https://gist.github.com/EricRabil/b8c959c0abfe0c5628c31ca85ac985dd/raw/").json();
        data.forEach(map => this.iconRegistry[map.id] = map);
        await this.client.login(this.options.token);
        this.client.on("presenceUpdate", async (_, presence) => {
            var _a, _b;
            const id = ((_a = presence.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = presence.member) === null || _b === void 0 ? void 0 : _b.id) || presence['userID'];
            if (!id)
                return;
            const storage = await this.container();
            const scopes = Object.entries(storage.data.scopeBindings).filter(([, snowflake]) => snowflake === id).map(([scope]) => scope);
            if (scopes.length === 0)
                return;
            scopes.forEach(scope => this.emit("updated", scope));
        });
        this.client.on("message", async (message) => {
            if (!message.cleanContent.startsWith(this.options.prefix))
                return;
            const [command, ...args] = message.cleanContent.substring(this.options.prefix.length).split(" ");
            switch (command) {
                case "link": {
                    if (message.channel.type !== "dm")
                        return message.delete().then(() => message.channel.send(`<@${message.author.id}>, please run \`!link\` over DM. It is insecure to post your link code in public channels.`));
                    if (this.linkLocks[message.author.id]) {
                        this.deferLinkLock(message.author.id);
                        if (!this.linkLockWarns[message.author.id]) {
                            message.reply("Sorry! You can only run `!link` once every few seconds. Please wait a few moments, then try again.");
                            this.linkLockWarns[message.author.id] = true;
                        }
                        return;
                    }
                    const [userID, code] = args;
                    if (!code || !userID)
                        return message.reply(`Usage: \`${this.options.prefix}link {userID} {code}\``);
                    const storage = await this.container();
                    if (storage.data.scopeBindings[userID] === message.author.id)
                        return message.reply(`You are already linked to \`${discord_js_1.Util.removeMentions(userID)}\``);
                    const user = await entities_1.User.findOne({ userID });
                    if (!user)
                        return message.reply(`Sorry, I couldn't find a user with the ID \`${discord_js_1.Util.removeMentions(userID)}\`.`);
                    this.deferLinkLock(message.author.id);
                    const success = await user.testLinkCode(code);
                    if (!success)
                        return message.reply(`Sorry, the link code you provided is either invalid or expired.`);
                    storage.data.scopeBindings[userID] = message.author.id;
                    await storage.save();
                    this.emit("updated", userID);
                    message.reply(`Presences for <@${message.author.id}> will now pipe to \`${discord_js_1.Util.removeMentions(userID)}\``);
                    break;
                }
                case "unlink": {
                    const [userID] = args;
                    if (!userID)
                        return message.reply(`Usage: \`${this.options.prefix}unlink {userID}\``);
                    const storage = await this.container();
                    if (storage.data.scopeBindings[userID] !== message.author.id)
                        return message.reply(`Sorry, ${discord_js_1.Util.removeMentions(userID)} is not linked to your account.`);
                    delete storage.data.scopeBindings[userID];
                    await storage.save();
                    message.reply(`Successfully unlinked ${discord_js_1.Util.removeMentions(userID)} from your account.`);
                    this.emit("updated", userID);
                    break;
                }
                case "link-state": {
                    const storage = await this.container();
                    const scopes = Object.entries(storage.data.scopeBindings).filter(([scope, snowflake]) => snowflake === message.author.id).map(([scope]) => discord_js_1.Util.removeMentions(scope));
                    if (scopes.length === 1)
                        message.reply(`You are currently linked to \`${scopes[0]}\``);
                    else if (scopes.length > 1)
                        message.reply(`\`\`\`md\n# Here are the scopes linked to your account:\n\n${scopes.map(scope => `- ${scope}`).join("\n")}\n\`\`\``);
                    else
                        message.reply(`You are not linked to any users right now.`);
                    break;
                }
                case "help": {
                    const commands = ["link", "unlink", "link-state", "s-link", "s-unlink", "s-link-state", "s-approve"];
                    message.reply(`\`\`\`md\n# Commands\n\n${commands.map(c => `- ${this.options.prefix}${c}`).join("\n")}\n\`\`\``);
                }
            }
        });
        await ready;
        this.log.info("Connected to Discord.");
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    deferLinkLock(id) {
        this.linkLocks[id] = setTimeout(() => (delete this.linkLocks[id], delete this.linkLockWarns[id]), 5000);
        this.linkLockWarns[id] = this.linkLockWarns[id] || false;
    }
    async discordPresences(scope) {
        var _a;
        const container = await this.container();
        const snowflake = container.data.scopeBindings[scope];
        if (!snowflake)
            return [];
        return (_a = this.client.users.resolve(snowflake)) === null || _a === void 0 ? void 0 : _a.presence.activities;
    }
    async userExcludes(scope) {
        const user = await entities_1.User.findOne({ userID: scope });
        if (!user)
            return [];
        return user.excludes;
    }
    async activityForUser(scope) {
        var _a;
        const presences = await this.discordPresences(scope);
        const excludes = await this.userExcludes(scope);
        return ((_a = presences) === null || _a === void 0 ? void 0 : _a.filter(activity => !excludes.includes(activity.name)).map(activity => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return (new remote_presence_utils_1.PresenceBuilder()
                .title(activity.name)
                .largeText(activity.details || ((_a = activity.assets) === null || _a === void 0 ? void 0 : _a.largeText))
                .image((((_b = activity.assets) === null || _b === void 0 ? void 0 : _b.largeImage) || ((_c = activity.assets) === null || _c === void 0 ? void 0 : _c.smallImage)) ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${((_d = activity.assets) === null || _d === void 0 ? void 0 : _d.largeImage) || ((_e = activity.assets) === null || _e === void 0 ? void 0 : _e.smallImage)}.png` : `https://cdn.discordapp.com/app-icons/${activity.applicationID}/${this.iconRegistry[activity.applicationID].icon}.webp?size=256&keep_aspect_ratio=false`)
                .smallText(activity.state)
                .start((_g = (_f = activity.timestamps) === null || _f === void 0 ? void 0 : _f.start) === null || _g === void 0 ? void 0 : _g.getTime())
                .stop((_j = (_h = activity.timestamps) === null || _h === void 0 ? void 0 : _h.end) === null || _j === void 0 ? void 0 : _j.getTime())
                .id(activity.applicationID)
                .presence);
        })) || [];
    }
    convertActivities(snowflake) {
        var _a, _b;
        const presences = (_a = this.client.users.resolve(snowflake)) === null || _a === void 0 ? void 0 : _a.presence.activities;
        return ((_b = presences) === null || _b === void 0 ? void 0 : _b.map(activity => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return (new remote_presence_utils_1.PresenceBuilder()
                .title(activity.name)
                .largeText(activity.details || ((_a = activity.assets) === null || _a === void 0 ? void 0 : _a.largeText))
                .image((((_b = activity.assets) === null || _b === void 0 ? void 0 : _b.largeImage) || ((_c = activity.assets) === null || _c === void 0 ? void 0 : _c.smallImage)) ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${((_d = activity.assets) === null || _d === void 0 ? void 0 : _d.largeImage) || ((_e = activity.assets) === null || _e === void 0 ? void 0 : _e.smallImage)}.png` : `https://cdn.discordapp.com/app-icons/${activity.applicationID}/${this.iconRegistry[activity.applicationID].icon}.webp?size=256&keep_aspect_ratio=false`)
                .smallText(activity.state)
                .start((_g = (_f = activity.timestamps) === null || _f === void 0 ? void 0 : _f.start) === null || _g === void 0 ? void 0 : _g.getTime())
                .stop((_j = (_h = activity.timestamps) === null || _h === void 0 ? void 0 : _h.end) === null || _j === void 0 ? void 0 : _j.getTime())
                .id(activity.applicationID)
                .presence);
        })) || [];
    }
    /**
     * Returns all activities, useful for service initialization
     */
    async activities() {
        const container = await this.container();
        /** Maps a discord snowflake to all bound scopes */
        const snowflakes = Object.values(container.data.scopeBindings).filter((s, i, a) => a.indexOf(s) === i);
        const activities = snowflakes.reduce((acc, snowflake) => Object.assign(acc, { [snowflake]: this.convertActivities(snowflake) }), {});
        return Object.entries(container.data.scopeBindings).reduce((acc, [scope, snowflake]) => Object.assign(acc, { [scope]: activities[snowflake] }), {});
    }
}
exports.DiscordAdapter = DiscordAdapter;
