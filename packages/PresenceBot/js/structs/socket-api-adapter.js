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
const remote_presence_utils_1 = require("remote-presence-utils");
const uuid = __importStar(require("uuid"));
const utils_1 = require("../utils");
const entities_1 = require("../database/entities");
const security_1 = require("../security");
const scoped_adapter_1 = require("./scoped-adapter");
function Handler(payloadType) {
    return function (target, property, descriptor) {
        if (!target.handlers)
            target.handlers = utils_1.blackHat(HandlerStructBase);
        target.handlers[payloadType] = { property: property, handler: target[property] };
    };
}
exports.Handler = Handler;
function MetadataSetter(metadataKey, defaultValue) {
    return function (value = defaultValue) {
        return function (target, property, descriptor) {
            if (!target.handlerMetadata)
                target.handlerMetadata = utils_1.blackHat(HandlerMetadataBase);
            target.handlerMetadata[property][metadataKey] = value;
        };
    };
}
exports.Authed = MetadataSetter("authed", true);
exports.FirstParty = MetadataSetter("firstParty", true);
exports.DenyFirstParty = MetadataSetter("denyFirstParty", true);
exports.DenyAuthed = MetadataSetter("denyAuthed", true);
exports.FIRST_PARTY_SCOPE = Symbol("FIRST_PARTY");
class SocketContext {
    constructor(ws, adapter) {
        this.ws = ws;
        this.adapter = adapter;
        this.close = this.ws.close.bind(this.ws);
        this.id = uuid.v4();
    }
    send(type, data = null) {
        this.assertAlive();
        this.ws.send(JSON.stringify({ type, data }));
        this.log.debug("Sending payload to socket", { socketID: this.id, payload: { type, data } });
    }
    get log() {
        return SocketContext.socketLog;
    }
    get scope() {
        this.assertAlive();
        return this.adapter.sockets.get(this.ws);
    }
    get authenticated() {
        this.assertAlive();
        return this.adapter.isAuthenticated(this.ws);
    }
    get firstParty() {
        this.assertAlive();
        return this.adapter.isFirstParty(this.ws);
    }
    get dead() {
        return this.adapter.contexts.get(this.ws) !== this;
    }
    assertAlive() {
        if (this.dead) {
            throw new Error("Cannot use context after socket is closed.");
        }
    }
}
exports.SocketContext = SocketContext;
SocketContext.socketLog = utils_1.log.child({ name: "SocketContext" });
const HandlerStructBase = {
    property: null,
    handler: null
};
const HandlerMetadataBase = {
    authed: false,
    denyAuthed: false,
    firstParty: false,
    denyFirstParty: false
};
class SocketAPIAdapter extends scoped_adapter_1.ScopedPresenceAdapter {
    constructor(app, path) {
        super();
        /**
         * A map of sockets to their scope ID
         */
        this.sockets = new Map();
        this.contexts = new Map();
        this.log = utils_1.log.child({ name: "SocketAPIAdapter " });
        app.ws(path, {
            open: (ws) => {
                this.contexts.set(ws, new SocketContext(ws, this));
                this.log.debug("Socket connected", { socketID: this.contexts.get(ws).id });
            },
            close: (ws) => {
                this.closed(this.contexts.get(ws).id);
                this.contexts.delete(ws);
                this.sockets.delete(ws);
            },
            message: (ws, message) => {
                const rawString = Buffer.from(message).toString('utf8');
                var parsed;
                try {
                    parsed = JSON.parse(rawString);
                }
                catch (e) {
                    this.log.error('Failed to parse payload from remote client', { rawString, e });
                    // close the socket for making us deal with this shit
                    ws.close();
                    return;
                }
                if (!remote_presence_utils_1.isRemotePayload(parsed))
                    return;
                if (!this.handlers[parsed.type])
                    return;
                const { property, handler } = this.handlers[parsed.type];
                if (!handler)
                    return;
                const { authed, firstParty, denyFirstParty, denyAuthed } = this.handlerMetadata[property];
                const context = this.contexts.get(ws);
                // enforce properly-formed payloads.
                if (!remote_presence_utils_1.PayloadValidators[parsed.type] || !remote_presence_utils_1.PayloadValidators[parsed.type](parsed)) {
                    this.log.debug('Got an invalid payload from the socket. Closing.', { payload: parsed, socketID: context });
                    context.close();
                    return;
                }
                // enforce denial of authenticated clients
                if (denyAuthed && context.authenticated) {
                    context.close();
                    return;
                }
                // enforce authenticated
                if (authed && !context.authenticated) {
                    context.close();
                    return;
                }
                // enforce denial of first party clients
                if (denyFirstParty && context.firstParty || context.scope === exports.FIRST_PARTY_SCOPE) {
                    context.close();
                    return;
                }
                // enforce first party
                if (firstParty && !context.firstParty) {
                    context.close();
                    return;
                }
                this.log.debug('Passing payload to handler', { payload: parsed, socketID: context.id });
                handler.call(this, context, parsed.data);
            }
        });
    }
    /**
     * Identification handler for sockets. Must return true if authentication failed, and false if otherwise.
     * @param ws socket context
     * @param data payload data
     */
    async identificationHandler(ws, token, sendGreetings = true) {
        this.log.debug("Socket initiated authentication flow.", { socketID: ws.id });
        var identity = await security_1.SecurityKit.validateApiKey(token);
        // invalid or expired identity
        if (!identity) {
            this.log.debug("Invalid identity for socket.", { socketID: ws.id });
            ws.close();
            return false;
        }
        // set the identity to the uuid
        if (identity instanceof entities_1.User) {
            identity = identity.userID;
        }
        // Socket joined the game
        this.authenticate(ws, identity);
        if (sendGreetings) {
            ws.send(remote_presence_utils_1.PayloadType.GREETINGS);
        }
        return true;
    }
    pingHandler(ws) {
        ws.send(remote_presence_utils_1.PayloadType.PONG);
    }
    closed(id) {
        this.log.debug("Socket closed.", { socketID: id });
    }
    authenticate(ws, scope) {
        if (ws instanceof SocketContext)
            ws = ws.ws;
        this.sockets.set(ws, scope);
    }
    isAuthenticated(ws) {
        return this.sockets.has(ws);
    }
    isFirstParty(ws) {
        return this.sockets.get(ws) === exports.FIRST_PARTY_SCOPE;
    }
}
__decorate([
    Handler(remote_presence_utils_1.PayloadType.IDENTIFY),
    exports.DenyAuthed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SocketContext, Object, Boolean]),
    __metadata("design:returntype", Promise)
], SocketAPIAdapter.prototype, "identificationHandler", null);
__decorate([
    Handler(remote_presence_utils_1.PayloadType.PING),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SocketContext]),
    __metadata("design:returntype", void 0)
], SocketAPIAdapter.prototype, "pingHandler", null);
exports.SocketAPIAdapter = SocketAPIAdapter;
