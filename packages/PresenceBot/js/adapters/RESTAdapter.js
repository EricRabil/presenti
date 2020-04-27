"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const scoped_adapter_1 = require("../structs/scoped-adapter");
const remote_presence_utils_1 = require("remote-presence-utils");
const uuid = __importStar(require("uuid"));
const utils_1 = require("../utils");
const socket_api_adapter_1 = require("../structs/socket-api-adapter");
var StatusCodes;
(function (StatusCodes) {
    StatusCodes["BAD_REQ"] = "400 Bad Request";
    StatusCodes["UNAUTHORIZED"] = "401 Unauthorized";
    StatusCodes["OK"] = "200 OK";
})(StatusCodes = exports.StatusCodes || (exports.StatusCodes = {}));
exports.Responses = {
    JSON: ['Content-Type', 'application/json'],
    HTML: ['Content-Type', 'text/html']
};
;
const error = (message) => JSON.stringify({ error: message });
const clean = (str) => { var _a; return (_a = str) === null || _a === void 0 ? void 0 : _a.replace(/(\r\n|\n|\r)/gm, ""); };
function handler(exec, headers = []) {
    return (res, req) => {
        res.onAborted(() => {
            if (res.stream) {
                res.stream.destroy();
            }
            res.aborted = true;
        });
        res._reqHeaders = {};
        headers.forEach(h => {
            res._reqHeaders[h] = req.getHeader(h);
        });
        res._reqUrl = req.getUrl();
        res._reqQuery = req.getQuery();
        res._data = [];
        res._readable = false;
        res._readListeners = [];
        res.onReadable = function (cb) {
            if (this._readable) {
                cb();
            }
            else {
                this._readListeners.push(cb);
            }
        };
        res.onData((chunk, last) => {
            res._data.push(chunk);
            if (last) {
                res._readable = true;
                res._readListeners.forEach((listener) => listener());
            }
        });
        exec(res, req);
    };
}
exports.handler = handler;
class RESTAdapter extends scoped_adapter_1.ScopedPresenceAdapter {
    constructor(app, validate, options = {}) {
        super();
        this.validate = validate;
        this.options = options;
        this.sessionIndex = {};
        this.expirationTimeouts = {};
        this.presences = {};
        this.state = remote_presence_utils_1.AdapterState.READY;
        if (!options.sessionExpiryMS)
            options.sessionExpiryMS = RESTAdapter.DEFAULT_EXPIRY_MS;
        const sessionBased = async (res, req) => {
            const params = new URLSearchParams(req.getQuery());
            const token = clean(params.get('token'));
            const sessionID = clean(params.get('id'));
            if (!token || !sessionID) {
                res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...exports.Responses.JSON).end(error("Please provide a token and session ID."));
                return;
            }
            const user = await validate(token);
            if (!user || !this.sessionIndex[sessionID]) {
                res.writeStatus(StatusCodes.UNAUTHORIZED).writeHeader(...exports.Responses.JSON).end(error("Invalid session or token."));
                return;
            }
            const body = await utils_1.readRequest(res).catch(e => null);
            return {
                body,
                user,
                sessionID
            };
        };
        app.get('/session', (res, req) => {
            const executor = async () => {
                const params = new URLSearchParams(req.getQuery());
                const token = clean(params.get('token'));
                if (!token) {
                    res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...exports.Responses.JSON).end(error("Please provide a token."));
                    return;
                }
                const user = await validate(token);
                if (!user) {
                    res.writeStatus(StatusCodes.UNAUTHORIZED).writeHeader(...exports.Responses.JSON).end(error("Invalid token."));
                    return;
                }
                if (user === socket_api_adapter_1.FIRST_PARTY_SCOPE) {
                    res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...exports.Responses.JSON).end(JSON.stringify({
                        msg: "First party clients cannot use this endpoint."
                    }));
                    return;
                }
                const sessionID = this.createSession(user);
                res.writeStatus(StatusCodes.OK).writeHeader(...exports.Responses.JSON).end(JSON.stringify({
                    sessionID,
                    expires: this.options.sessionExpiryMS
                }));
            };
            res.onAborted(() => {
            });
            executor();
        }).put('/session', (res, req) => {
            const executor = async () => {
                const sessionData = await sessionBased(res, req);
                if (!sessionData)
                    return;
                const { body, sessionID, user } = sessionData;
                if (!body || !("presences" in body) || !Array.isArray(body.presences)) {
                    res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...exports.Responses.JSON).end(error("Malformed body data."));
                }
                this.presences[sessionID] = body.presences;
                this.emit("updated", user);
                res.writeStatus(StatusCodes.OK).writeHeader(...exports.Responses.JSON).end(JSON.stringify({ ok: true }));
            };
            res.onAborted(() => {
            });
            executor();
        }).put('/session/refresh', handler(async (res, req) => {
            const sessionData = await sessionBased(res, req);
            if (!sessionData)
                return;
            const { sessionID } = sessionData;
            this.scheduleExpiry(sessionID);
            res.writeStatus(StatusCodes.OK).writeHeader(...exports.Responses.JSON).end(JSON.stringify({ ok: true }));
        }));
    }
    /**
     * Creates a session for the given user, returning the session ID
     * @param user user ID
     */
    createSession(user) {
        const sessionID = uuid.v4();
        this.sessionIndex[sessionID] = user;
        this.presences[sessionID] = [];
        this.scheduleExpiry(sessionID);
        return sessionID;
    }
    /**
     * Destroys a given session
     * @param session session ID
     */
    destroySession(session) {
        const user = this.sessionIndex[session];
        this.clearExpiry(session);
        delete this.sessionIndex[session];
        delete this.presences[session];
        this.emit("updated", user);
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
        }, this.options.sessionExpiryMS);
    }
    async activityForUser(id) {
        const activities = Object.entries(this.sessionIndex).filter(([, user]) => user === id).map(([session]) => this.presences[session]).reduce((a, c) => a.concat(c), []);
        return activities;
    }
    async activities() {
        const activities = await Promise.all(Object.values(this.sessionIndex).filter((u, i, a) => a.indexOf(u) === i).map(async (u) => ({ user: u, presence: await this.activityForUser(u) })));
        return activities.reduce((acc, { user, presence }) => Object.assign(acc, { [user]: presence }), {});
    }
    async run() {
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    activity() {
        return [];
    }
}
exports.RESTAdapter = RESTAdapter;
/**
 * By default, the session will expire in five minutes.
 */
RESTAdapter.DEFAULT_EXPIRY_MS = 1000 * 10;
