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
const logging_1 = require("../utils/logging");
const entities_1 = require("../database/entities");
const security_1 = require("../utils/security");
const scoped_adapter_1 = require("./scoped-adapter");
const object_1 = require("../utils/object");
function Handler(payloadType) {
    return function (target, property, descriptor) {
        if (!target.handlers)
            target.handlers = object_1.blackHat(HandlerStructBase);
        target.handlers[payloadType] = { property: property, handler: target[property] };
    };
}
exports.Handler = Handler;
function MetadataSetter(metadataKey, defaultValue) {
    return function (value = defaultValue) {
        return function (target, property, descriptor) {
            if (!target.handlerMetadata)
                target.handlerMetadata = object_1.blackHat(HandlerMetadataBase);
            target.handlerMetadata[property][metadataKey] = value;
        };
    };
}
exports.Authed = MetadataSetter("authed", true);
exports.FirstParty = MetadataSetter("firstParty", true);
exports.DenyFirstParty = MetadataSetter("denyFirstParty", true);
exports.DenyAuthed = MetadataSetter("denyAuthed", true);
exports.FIRST_PARTY_SCOPE = Symbol("FIRST_PARTY");
/** Contextual wrapper for socket connections */
class SocketContext {
    constructor(ws, adapter) {
        this.ws = ws;
        this.adapter = adapter;
        this.id = uuid.v4();
    }
    close() {
        this.ws.close();
    }
    /**
     * Sends a payload to the socket
     * @param type payload type
     * @param data data to send, null if empty
     */
    send(type, data = null) {
        this.assertAlive();
        this.ws.send(JSON.stringify({ type, data }));
        this.log.debug("Sending payload to socket", { socketID: this.id, payload: { type, data } });
    }
    get log() {
        return SocketContext.socketLog;
    }
    /** The scope this socket is connected to */
    get scope() {
        this.assertAlive();
        return this.adapter.sockets.get(this.ws);
    }
    /** Whether the socket has authenticated with the server */
    get authenticated() {
        this.assertAlive();
        return this.adapter.isAuthenticated(this.ws);
    }
    /** Whether the socket is a first-party connection */
    get firstParty() {
        this.assertAlive();
        return this.adapter.isFirstParty(this.ws);
    }
    /** Whether the socket is closed */
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
SocketContext.socketLog = logging_1.log.child({ name: "SocketContext" });
const HandlerStructBase = {
    property: null,
    handler: null
};
/** Initial metadata object */
const HandlerMetadataBase = {
    authed: false,
    denyAuthed: false,
    firstParty: false,
    denyFirstParty: false
};
/** Foundation for any socket-based API */
class SocketAPIAdapter extends scoped_adapter_1.ScopedPresenceAdapter {
    constructor(app, path) {
        super();
        /**
         * A map of sockets to their scope ID
         */
        this.sockets = new Map();
        this.contexts = new Map();
        this.log = logging_1.log.child({ name: "SocketAPIAdapter " });
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
                    this.log.debug('Got an invalid payload from the socket. Closing.', { payload: parsed, socketID: context.id });
                    context.close();
                    return;
                }
                const trace = (msg) => this.log.debug(msg, { payload: parsed, socketID: context.id });
                // enforce denial of authenticated clients
                if (denyAuthed && context.authenticated) {
                    trace('Closing socket for calling an endpoint that requires un-authentication.');
                    context.close();
                    return;
                }
                // enforce authenticated
                if (authed && !context.authenticated) {
                    trace('Closing socket for calling an endpoint that requires authentication, when they weren\'t authenticated.');
                    context.close();
                    return;
                }
                // enforce denial of first party clients
                if (denyFirstParty && (context.firstParty || context.scope === exports.FIRST_PARTY_SCOPE)) {
                    trace('Closing first-party socket for calling an endpoint that is not for first-parties.');
                    context.close();
                    return;
                }
                // enforce first party
                if (firstParty && !context.firstParty) {
                    trace('Closing third-party socket for calling and endpoint that is for first-parties.');
                    context.close();
                    return;
                }
                if (process.env.PRESENTI_LOG_SOCKET_PAYLOADS) {
                    this.log.debug('Passing payload to handler', { payload: parsed.type === remote_presence_utils_1.PayloadType.IDENTIFY ? { type: remote_presence_utils_1.PayloadType.IDENTIFY, data: "REDACTED" } : parsed, socketID: context.id });
                }
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
    /**
     * Expert ping-pong player.
     * @param ws socket context
     */
    pingHandler(ws) {
        ws.send(remote_presence_utils_1.PayloadType.PONG);
    }
    /**
     * Called upon close
     * @param id socket ID
     */
    closed(id) {
        this.log.debug("Socket closed.", { socketID: id });
    }
    /**
     * Marks a socket as authenticated with the given scope
     * @param ws socket/socket context
     * @param scope socket scope
     */
    authenticate(ws, scope) {
        if (ws instanceof SocketContext)
            ws = ws.ws;
        this.sockets.set(ws, scope);
    }
    /**
     * Returns true if the socket is authenticated
     * @param ws socket
     */
    isAuthenticated(ws) {
        return this.sockets.has(ws);
    }
    /**
     * Returns true if the socket is first-party scoped
     * @param ws socket
     */
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
