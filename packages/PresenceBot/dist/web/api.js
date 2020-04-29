"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const remote_presence_utils_1 = require("remote-presence-utils");
const querystring_1 = __importDefault(require("querystring"));
const entities_1 = require("../database/entities");
const rest_api_base_1 = __importStar(require("../structs/rest-api-base"));
const shared_middleware_1 = require("../utils/web/shared-middleware");
const loaders_1 = require("./loaders");
const middleware_1 = require("./middleware");
const canned_responses_1 = require("./canned-responses");
const config_1 = require("../utils/config");
const logging_1 = __importDefault(require("../utils/logging"));
const socket_api_base_1 = require("../structs/socket-api-base");
/** Format of ://localhost:8138, s://api.ericrabil.com */
const DISCORD_REDIRECT = (host) => `http://${host}/api/oauth/discord/callback`;
const DISCORD_CALLBACK = (host) => `https://discordapp.com/api/oauth2/authorize?client_id=696639929605816371&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT(host))}&response_type=code&scope=identify`;
class PresentiAPI extends rest_api_base_1.default {
    constructor() {
        super(...arguments);
        this.log = logging_1.default.child({ name: "PresentiAPI-REST" });
    }
    loadRoutes() {
        super.loadRoutes();
        this.app.any('/api/*', this.buildHandler(rest_api_base_1.RouteDataShell("/api/*"), (req, res) => {
            canned_responses_1.notFoundAPI(res);
        }));
    }
    buildStack(metadata, middleware, headers = []) {
        return super.buildStack(metadata, middleware, headers.concat('authorization', 'host'));
    }
    async generateLinkCode(req, res) {
        const code = await res.user.linkCode();
        res.json({ code });
    }
    async validateLinkCode(req, res) {
        const { scope, code } = req.body || {};
        if (!scope || !code) {
            return res.writeStatus(400).json({ error: "The 'scope' and 'code' properties are required." });
        }
        const user = await entities_1.User.findOne({ userID: scope });
        if (!user) {
            return res.writeStatus(404).json({ error: "No user matches that scope." });
        }
        return res.json({ valid: await user.testLinkCode(code) });
    }
    async generateAPIKey(req, res) {
        const components = new URLSearchParams(req.getQuery());
        const key = await res.user.apiKey();
        res.json({ key });
    }
    async redirectToDiscord(req, res) {
        if (this.disableDiscordAPIs)
            return canned_responses_1.notFoundAPI(res);
        res.redirect(DISCORD_CALLBACK(req.getHeader('host')));
    }
    async unlinkDiscord(req, res) {
        if (this.disableDiscordAPIs)
            return canned_responses_1.notFoundAPI(res);
        delete res.user.platforms[remote_presence_utils_1.OAUTH_PLATFORM.DISCORD];
        await res.user.save();
        res.redirect('/');
    }
    async discordCallback(req, res) {
        if (this.disableDiscordAPIs)
            return canned_responses_1.notFoundAPI(res);
        const params = new URLSearchParams(req.getQuery());
        const code = params.get("code");
        if (!code) {
            res.writeStatus(400).json({ error: "Malformed OAuth callback." });
            return;
        }
        const data = await node_fetch_1.default("https://discordapp.com/api/v6/oauth2/token", {
            method: "post",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring_1.default.stringify({
                client_id: config_1.CONFIG.discord.clientID,
                client_secret: config_1.CONFIG.discord.clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT(req.getHeader('host')),
                scope: 'identify'
            })
        }).then(r => r.json());
        if (!("token_type" in data && "access_token" in data)) {
            this.log.warn("Got an errored response upon oauth completion", { data, user: res.user.uuid });
            return res.redirect('/');
        }
        const token = `${data.token_type} ${data.access_token}`;
        const { id } = await node_fetch_1.default("https://discordapp.com/api/v6/users/@me", {
            method: "get",
            headers: {
                'authorization': token
            }
        }).then(r => r.json());
        res.user.platforms[remote_presence_utils_1.OAUTH_PLATFORM.DISCORD] = id;
        await res.user.save();
        res.redirect('/');
    }
    async lookupUser(req, res) {
        const userID = req.getParameter(0);
        const full = res.user === socket_api_base_1.FIRST_PARTY_SCOPE;
        const user = await entities_1.User.findOne({ userID });
        console.log(userID);
        if (!user) {
            return res.writeStatus(404).json({ error: "Unknown user." });
        }
        res.json(user.json(full || (userID === user.userID)));
    }
    get disableDiscordAPIs() {
        return !config_1.CONFIG.discord || !config_1.CONFIG.discord.clientID || !config_1.CONFIG.discord.clientSecret;
    }
}
__decorate([
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.GENERATE_LINK_CODE, "get", loaders_1.UserLoader(), middleware_1.IdentityGuard, middleware_1.DenyFirstPartyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "generateLinkCode", null);
__decorate([
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.LINK_CODE, "post", loaders_1.UserLoader(true), shared_middleware_1.BodyParser, middleware_1.FirstPartyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "validateLinkCode", null);
__decorate([
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.API_KEY, "get", loaders_1.UserLoader(), middleware_1.IdentityGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "generateAPIKey", null);
__decorate([
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.DISCORD_AUTH, "get", loaders_1.UserLoader(), middleware_1.IdentityGuard, middleware_1.DenyFirstPartyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "redirectToDiscord", null);
__decorate([
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.DISCORD_AUTH_UNLINK, "get", loaders_1.UserLoader(), middleware_1.IdentityGuard, middleware_1.DenyFirstPartyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "unlinkDiscord", null);
__decorate([
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.DISCORD_AUTH_CALLBACK, "get", loaders_1.UserLoader(), middleware_1.IdentityGuard, middleware_1.DenyFirstPartyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "discordCallback", null);
__decorate([
    rest_api_base_1.Route("/api/users/:userID", "get", loaders_1.UserLoader(true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "lookupUser", null);
exports.default = PresentiAPI;
