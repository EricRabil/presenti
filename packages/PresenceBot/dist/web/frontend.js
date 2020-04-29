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
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../utils/config");
const entities_1 = require("../database/entities");
const rest_api_base_1 = __importStar(require("../structs/rest-api-base"));
const shared_middleware_1 = require("../utils/web/shared-middleware");
const canned_responses_1 = require("./canned-responses");
const loaders_1 = require("./loaders");
const middleware_1 = require("./middleware");
/** Frontend routes */
class Frontend extends rest_api_base_1.default {
    constructor(app) {
        super(app, Frontend.VIEWS_DIRECTORY);
        this.app = app;
    }
    loadRoutes() {
        super.loadRoutes();
        this.app.any('/*', this.buildHandler(rest_api_base_1.RouteDataShell("/*"), (req, res) => {
            canned_responses_1.notFound(res);
        }));
    }
    buildStack(metadata, middleware, headers = []) {
        return super.buildStack(metadata, [loaders_1.UserLoader()].concat(middleware), headers.concat('authorization'));
    }
    /** Renders the login page */
    loginView(req, res) {
        res.render('login', { signup: config_1.CONFIG.registration });
    }
    /** Renders the signup page, if registration is enabled */
    signupView(req, res) {
        if (!config_1.CONFIG.registration)
            return canned_responses_1.notFound(res);
        res.render('signup');
    }
    /** Renders the change password page, if the user is signed in */
    changePassword(req, res) {
        res.render('changepw');
    }
    /** Called upon change password form submission, accepts "password" and "newPassword" in the form body */
    async changePasswordComplete(req, res) {
        const fail = (msg) => res.render('changepw', { error: msg });
        if (!req.body || !req.body.password || !req.body.newPassword) {
            return fail('Please fill out all required fields.');
        }
        const { password, newPassword } = req.body;
        if (!await res.user.checkPassword(password)) {
            return fail('Please enter the correct old password.');
        }
        await res.user.setPassword(newPassword);
        await res.user.save();
        res.render('changepw', { message: 'Your password has been changed. All existing tokens have been invalidated.' });
    }
    /** Called upon signup form submission, accepts "id" and "password" in the form body */
    async signupComplete(req, res) {
        if (!config_1.CONFIG.registration)
            return canned_responses_1.notFound(res);
        const fail = (msg) => res.render('signup', { error: msg });
        if (!req.body || !req.body.id || !req.body.password) {
            return fail('Please fill out all required fields.');
        }
        const { id: userID, password } = req.body;
        let user = await entities_1.User.findOne({ userID });
        if (user)
            return fail("A user with that ID already exists. Please select a different one.");
        user = await entities_1.User.createUser(userID, password);
        await user.save();
        const token = await user.token(password);
        if (!token)
            return fail("Sorry, we couldn't finish logging you in.");
        res.setCookie('identity', token, { httpOnly: true });
        res.redirect('/');
    }
    /** Called to sign out the user */
    logout(req, res) {
        res.setCookie('identity', '', { maxAge: 0 });
        res.redirect('/');
    }
    /** Called upon login form submission, accepts "id" and "password" in form submission */
    async loginComplete(req, res) {
        const fail = () => res.render('login', { error: 'Invalid credentials.' });
        if (!req.body || !req.body.id || !req.body.password) {
            return fail();
        }
        const { id: userID, password } = req.body;
        const user = await entities_1.User.findOne({ userID });
        if (!user)
            return fail();
        const token = await user.token(password);
        if (!token)
            return fail();
        res.setCookie('identity', token, { httpOnly: true });
        res.redirect('/');
    }
    /** Renders the panel if signed in, and the login page otherwise */
    rootHandler(req, res) {
        if (!res.user) {
            res.redirect('/login');
            return;
        }
        res.redirect('/panel');
    }
    /** Renders the panel home page */
    panelView(req, res) {
        res.render('panel');
    }
    /** Serves assets for the presenti renderer */
    async presentiAssets(req, res) {
        const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
        const absolute = await Frontend.resolvePresenti(relative).catch(e => null);
        if (!absolute || !await fs_extra_1.default.pathExists(absolute).catch(e => false) || !await fs_extra_1.default.stat(absolute).then(stat => stat.isFile()).catch(e => false)) {
            return canned_responses_1.notFound(res);
        }
        await res.file(absolute);
    }
    /** Serves the page for the presenti renderer */
    renderer(req, res) {
        const params = new URLSearchParams(req.getQuery());
        const options = {
            noCSS: params.has('nocss'),
            scope: params.get('scope'),
            host: `ws${config_1.CONFIG.web.host}/presence/`
        };
        res.render('presenti', options);
    }
    /** Serves static assets for the panel */
    async staticAsset(req, res) {
        const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
        const absolute = Frontend.resolveStatic(relative);
        if (!absolute || !await fs_extra_1.default.pathExists(absolute) || !await fs_extra_1.default.stat(absolute).then(stat => stat.isFile())) {
            return canned_responses_1.notFound(res);
        }
        await res.file(absolute);
    }
    /** Resolves template files */
    static resolve(file) {
        if (!file.endsWith('.pug'))
            file = `${file}.pug`;
        return path_1.default.resolve(Frontend.VIEWS_DIRECTORY, file);
    }
    /** Resolves static assets */
    static resolveStatic(file) {
        const resolved = path_1.default.resolve(Frontend.STATIC_DIRECTORY, file);
        if (!resolved.startsWith(Frontend.STATIC_DIRECTORY))
            return null;
        return resolved;
    }
    /** Resolves presenti-renderer assets */
    static async resolvePresenti(file) {
        let resolved = path_1.default.resolve(Frontend.PRESENTI_ASSET_DIRECTORY, file);
        if (!resolved.startsWith(Frontend.PRESENTI_ASSET_DIRECTORY))
            return null;
        let [name, subdir] = resolved.split('/').reverse();
        if (subdir !== 'js' && subdir !== 'css')
            return null;
        const contents = await fs_extra_1.default.readdir(path_1.default.resolve(Frontend.PRESENTI_ASSET_DIRECTORY, subdir));
        const [prefix] = name.split('.');
        name = contents.find(c => c.split('.')[0] === prefix);
        if (!name)
            return null;
        return path_1.default.resolve(Frontend.PRESENTI_ASSET_DIRECTORY, subdir, name);
    }
}
Frontend.VIEWS_DIRECTORY = path_1.default.resolve(__dirname, "..", "..", "views");
Frontend.STATIC_DIRECTORY = path_1.default.resolve(__dirname, "..", "..", "assets");
Frontend.PRESENTI_ASSET_DIRECTORY = path_1.default.resolve(__dirname, "..", "..", "node_modules", "presenti-renderer", "dist");
__decorate([
    rest_api_base_1.Route("/login", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "loginView", null);
__decorate([
    rest_api_base_1.Route("/signup", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "signupView", null);
__decorate([
    rest_api_base_1.Route("/changepw", "get", middleware_1.IdentityGuardFrontend),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "changePassword", null);
__decorate([
    rest_api_base_1.Route("/changepw", "post", middleware_1.IdentityGuardFrontend, shared_middleware_1.BodyParser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Frontend.prototype, "changePasswordComplete", null);
__decorate([
    rest_api_base_1.Route("/signup", "post", shared_middleware_1.BodyParser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Frontend.prototype, "signupComplete", null);
__decorate([
    rest_api_base_1.Route("/logout", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "logout", null);
__decorate([
    rest_api_base_1.Route("/login", "post", shared_middleware_1.BodyParser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Frontend.prototype, "loginComplete", null);
__decorate([
    rest_api_base_1.Route("/", "any"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "rootHandler", null);
__decorate([
    rest_api_base_1.Route("/panel", "get", middleware_1.IdentityGuardFrontend),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "panelView", null);
__decorate([
    rest_api_base_1.Route("/p-assets/*", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Frontend.prototype, "presentiAssets", null);
__decorate([
    rest_api_base_1.Route("/renderer", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Frontend.prototype, "renderer", null);
__decorate([
    rest_api_base_1.Route("/assets/*", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Frontend.prototype, "staticAsset", null);
exports.default = Frontend;