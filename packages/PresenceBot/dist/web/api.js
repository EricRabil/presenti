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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const rest_api_base_1 = __importStar(require("../structs/rest-api-base"));
const middleware_1 = require("./middleware");
const loaders_1 = require("./loaders");
const remote_presence_utils_1 = require("remote-presence-utils");
const shared_middleware_1 = require("../utils/web/shared-middleware");
const entities_1 = require("../database/entities");
class PresentiAPI extends rest_api_base_1.default {
    loadRoutes() {
        super.loadRoutes();
        this.app.any('/api/*', this.buildHandler((req, res) => {
            res.writeStatus(404).json({ error: "Unknown endpoint." });
        }));
    }
    buildStack(middleware, headers = []) {
        return super.buildStack(middleware, headers.concat('authorization', 'host'));
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
        res.json({ host: req.getHeader('host') });
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
    rest_api_base_1.Route(remote_presence_utils_1.API_ROUTES.DISCORD_AUTH, "get", loaders_1.UserLoader(), middleware_1.IdentityGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PresentiAPI.prototype, "redirectToDiscord", null);
exports.default = PresentiAPI;
