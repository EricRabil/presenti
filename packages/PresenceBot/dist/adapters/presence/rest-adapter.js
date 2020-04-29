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
const rest_api_base_1 = __importStar(require("../../structs/rest-api-base"));
const scoped_adapter_1 = require("../../structs/scoped-adapter");
const presence_magic_1 = require("../../utils/presence-magic");
const remote_presence_utils_1 = require("remote-presence-utils");
const uuid = __importStar(require("uuid"));
const socket_api_base_1 = require("../../structs/socket-api-base");
const security_1 = require("../../utils/security");
const entities_1 = require("../../database/entities");
const logging_1 = require("../../utils/logging");
const shared_middleware_1 = require("../../utils/web/shared-middleware");
const middleware_1 = require("../../web/middleware");
const InsertAdapterGuard = (generator) => (req, res, next) => {
    res.adapter = generator();
    next();
};
const AdapterRunningGuard = (req, res, next) => {
    var _a;
    if (((_a = res.adapter) === null || _a === void 0 ? void 0 : _a.state) !== remote_presence_utils_1.AdapterState.RUNNING) {
        res.writeStatus(502).json({ error: "The REST service is not running yet." });
        return next(true);
    }
    next();
};
const clean = (str) => { var _a; return (_a = str) === null || _a === void 0 ? void 0 : _a.replace(/(\r\n|\n|\r)/gm, ""); };
const SessionGuard = async (req, res, next) => {
    var _a;
    const params = new URLSearchParams(req.getQuery());
    const token = clean(params.get("token"));
    const sessionID = clean(params.get("id"));
    if (!token || !sessionID) {
        res.writeStatus(400).json({ error: "Please provide a token and session ID." });
        return next(true);
    }
    const user = await security_1.SecurityKit.validateApiKey(token);
    if (!user || !((_a = res.adapter) === null || _a === void 0 ? void 0 : _a.sessionIndex[sessionID])) {
        res.writeStatus(401).json({ error: "Invalid session or token." });
        return next(true);
    }
    if (user instanceof entities_1.User) {
        res.user = user;
    }
    res.sessionID = sessionID;
    next();
};
const DenyFirstParties = (req, res, next) => {
    var _a;
    const { adapter, sessionID } = res;
    if (((_a = adapter.sessionIndex) === null || _a === void 0 ? void 0 : _a.sessionID) === socket_api_base_1.FIRST_PARTY_SCOPE) {
        res.writeStatus(400).json({ error: "First parties are not permitted to use this endpoint." });
        return next(true);
    }
    next();
};
class RESTPresenceAPI extends rest_api_base_1.default {
    constructor(app, adapter) {
        super(app);
        this.adapter = adapter;
        this.log = logging_1.log.child({ name: "RESTPresenceAPI" });
    }
    buildStack(metadata, middleware, headers = []) {
        return super.buildStack(metadata, [InsertAdapterGuard(() => this.adapter), AdapterRunningGuard].concat(middleware), headers);
    }
    async createSession(req, res) {
        const params = new URLSearchParams(req.getQuery());
        const token = clean(params.get('token'));
        if (!token) {
            res.writeStatus(400).json({ error: "Please provide a token." });
            return;
        }
        const user = await security_1.SecurityKit.validateApiKey(token);
        if (!user) {
            res.writeStatus(401).json({ error: "Invalid token." });
            return;
        }
        const sessionID = res.adapter.createSession(user);
        res.json({
            sessionID,
            expres: res.adapter.sessionExpiryMS
        });
    }
    async updateSession(req, res) {
        await this.updatePresence(res.adapter.sessionIndex[res.sessionID], req, res);
    }
    async updateSessionScope(req, res) {
        await this.updatePresence(req.getParameter(0), req, res);
    }
    async refreshSession(req, res) {
        const { sessionID } = res;
        res.adapter.scheduleExpiry(sessionID);
        res.json({ ok: true });
    }
    async updatePresence(scope, req, res) {
        var _a;
        if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.presences)) {
            res.writeStatus(400).json({ error: "Malformed body data." });
            return;
        }
        res.adapter.presenceLedger[res.sessionID][scope] = req.body.presences;
        res.json({ ok: true });
    }
}
__decorate([
    rest_api_base_1.Route("/session", "get"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RESTPresenceAPI.prototype, "createSession", null);
__decorate([
    rest_api_base_1.Route("/session", "put", SessionGuard, DenyFirstParties, shared_middleware_1.BodyParser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RESTPresenceAPI.prototype, "updateSession", null);
__decorate([
    rest_api_base_1.Route("/session/:scope", "put", SessionGuard, middleware_1.FirstPartyGuard, shared_middleware_1.BodyParser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RESTPresenceAPI.prototype, "updateSessionScope", null);
__decorate([
    rest_api_base_1.Route("/session/refresh", "put", SessionGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RESTPresenceAPI.prototype, "refreshSession", null);
exports.RESTPresenceAPI = RESTPresenceAPI;
class RESTAdapterV2 extends scoped_adapter_1.ScopedPresenceAdapter {
    constructor(app) {
        super();
        /** Format of Record<sessionID, scope> */
        this.sessionIndex = {};
        /** Format of Record<sessionID, number> */
        this.expirationTimeouts = {};
        /** Format of Record<sessionID, PresenceList> */
        this.presenceLedger = {};
        this.sessionExpiryMS = RESTAdapterV2.DEFAULT_EXPIRY_MS;
        this.log = logging_1.log.child({ name: "RestAdapterV2" });
        this.api = new RESTPresenceAPI(app, this);
    }
    /**
     * Creates a session for the given user, returning the session ID
     * @param user user ID
     */
    createSession(user) {
        const sessionID = uuid.v4();
        if (user instanceof entities_1.User) {
            user = user.userID;
        }
        this.log.debug("Creating session", { sessionID, user });
        this.sessionIndex[sessionID] = user;
        this.presenceLedger[sessionID] = this.createPresenceTable();
        this.scheduleExpiry(sessionID);
        return sessionID;
    }
    /**
     * Destroys a given session
     * @param session session ID
     */
    destroySession(session) {
        this.log.debug("Destroying session", { sessionID: session, user: this.sessionIndex[session] });
        this.clearExpiry(session);
        delete this.sessionIndex[session];
        delete this.presenceLedger[session];
    }
    /**
     * Clears the expiration timeout for a session
     * @param session session ID
     */
    clearExpiry(session) {
        if (this.expirationTimeouts[session])
            clearTimeout(this.expirationTimeouts[session]);
    }
    /**
     * Schedules a deferred expiration of a session using the configured expiration
     * @param session session ID
     */
    scheduleExpiry(session) {
        this.clearExpiry(session);
        this.expirationTimeouts[session] = setTimeout(() => {
            this.destroySession(session);
        }, this.sessionExpiryMS);
    }
    /**
     * Returns whether a given session can update a scope
     * @param sessionID session ID
     * @param scope scope
     */
    sessionCanUpdateScope(sessionID, scope) {
        return this.sessionIndex[sessionID] === scope || this.sessionIndex[sessionID] === socket_api_base_1.FIRST_PARTY_SCOPE;
    }
    async activityForUser(id) {
        const activities = Object.entries(this.sessionIndex).filter(([, user]) => user === id).map(([session]) => this.presenceLedger[session][id]).reduce((a, c) => a.concat(c), []);
        return activities;
    }
    async activities() {
        const activities = await Promise.all(Object.values(this.sessionIndex).filter((u, i, a) => a.indexOf(u) === i).map(async (u) => ({ user: u, presence: await this.activityForUser(u) })));
        return activities.reduce((acc, { user, presence }) => Object.assign(acc, { [user]: presence }), {});
    }
    run() {
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
        this.log.info("REST Presence API is running.");
    }
    /**
     * Creates a presence proxy that maps events to this adapter
     */
    createPresenceTable() {
        return presence_magic_1.PresenceMagic.createPresenceProxy(scope => this.emit("updated", scope));
    }
}
exports.RESTAdapterV2 = RESTAdapterV2;
/**
 * By default, the session will expire in five minutes.
 */
RESTAdapterV2.DEFAULT_EXPIRY_MS = 1000 * 60 * 5;
