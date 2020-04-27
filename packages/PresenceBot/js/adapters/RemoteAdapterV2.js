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
Object.defineProperty(exports, "__esModule", { value: true });
const remote_presence_utils_1 = require("remote-presence-utils");
const utils_1 = require("../utils");
const socket_api_adapter_1 = require("../structs/socket-api-adapter");
const presence_magic_1 = require("../utils/presence-magic");
class RemoteAdatpterV2 extends socket_api_adapter_1.SocketAPIAdapter {
    constructor(app) {
        super(app, '/remote');
        this.log = utils_1.log.child({ name: "RemoteAdapterV2" });
        /** Format of Record<socketID, Record<scope, PresenceList>> */
        this.firstPartyPresenceLedger = {};
        /** Format of Record<socketID, Record<scope, PresenceList>> */
        this.thirdPartyPresenceLedger = {};
        this.thirdPartyPresences = presence_magic_1.PresenceMagic.createPresenceDictCondenser(this.thirdPartyPresenceLedger);
        this.firstPartyPresences = presence_magic_1.PresenceMagic.createPresenceDictCondenser(this.firstPartyPresenceLedger);
    }
    run() {
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    presenceHandler(ws, data) {
        const { scope } = ws;
        this.log.debug("Handling presence update for socket", { scope });
        if (!Array.isArray(data))
            data = [data];
        data = data.filter(p => !!p);
        this.thirdPartyPresenceLedger[ws.id][scope] = data;
    }
    firstPartyPresenceHandler(ws, { scope, presence }) {
        if (!Array.isArray(presence))
            presence = [presence];
        presence = presence.filter(p => !!p);
        this.firstPartyPresenceLedger[ws.id][scope] = presence;
    }
    /**
     * Called when the socket is closed. Tears down the presence ledger for that socket.
     * @param ctx socket context, or { id: string } if the context is already gone.
     */
    closed(id) {
        super.closed(id);
        const wasFirstParty = this.firstPartyPresenceLedger[id];
        var scopes;
        if (wasFirstParty) {
            scopes = Object.keys(this.firstPartyPresenceLedger[id]);
            delete this.firstPartyPresenceLedger[id];
        }
        else {
            scopes = Object.keys(this.thirdPartyPresenceLedger[id]);
            delete this.thirdPartyPresenceLedger[id];
        }
        scopes.forEach(scope => this.emit("updated", scope));
    }
    /**
     * Generates a presence table for connected websockets
     * @param ws socket context
     * @param data identification data
     */
    async identificationHandler(ws, data) {
        const result = await super.identificationHandler(ws, data, false);
        if (!result)
            return false;
        this.log.debug("Initiated identifiaction handler");
        // After a socket has authenticated, generate a presence table for it.
        if (ws.firstParty) {
            this.firstPartyPresenceLedger[ws.id] = this.createPresenceTable();
            this.log.debug("Assigned first-party presence ledger for socket.", { socketID: ws.id });
        }
        else {
            this.thirdPartyPresenceLedger[ws.id] = this.createPresenceTable();
            this.log.debug("Assigned third-party presence ledger for socket.", { socketID: ws.id });
        }
        ws.send(remote_presence_utils_1.PayloadType.GREETINGS);
        return true;
    }
    /**
     * Returns a list of presences for a scope
     * @param scope scope
     */
    activityForUser(scope) {
        const firstParty = this.firstPartyPresences[scope];
        // first-party presences override third-party presences.
        const exclude = firstParty.map(p => p.id).filter(id => !!id);
        const thirdParty = this.thirdPartyPresences[scope].filter(({ id }) => !exclude.includes(id));
        return firstParty.concat(thirdParty);
    }
    async activities() {
        const firstPartyScopes = Object.values(this.firstPartyPresenceLedger).map(o => o && Object.keys(o)).filter(o => !!o);
        const thirdPartyScopes = Object.values(this.thirdPartyPresenceLedger).map(o => o && Object.keys(o)).filter(o => !!o);
        const activities = await Promise.all(firstPartyScopes.concat(thirdPartyScopes).reduce((a, c) => a.concat(c), []).filter((s, i, a) => a.indexOf(s) === i).map(async (s) => ({ scope: s, activities: this.activityForUser(s) })));
        return activities.reduce((acc, { scope, activities }) => Object.assign(acc, { [scope]: activities }), {});
    }
    /**
     * Creates a presence proxy that maps events to this adapter
     */
    createPresenceTable() {
        return presence_magic_1.PresenceMagic.createPresenceProxy(this.emit.bind(this, "updated"));
    }
}
__decorate([
    socket_api_adapter_1.Handler(remote_presence_utils_1.PayloadType.PRESENCE),
    socket_api_adapter_1.DenyFirstParty(),
    socket_api_adapter_1.Authed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_api_adapter_1.SocketContext, Object]),
    __metadata("design:returntype", void 0)
], RemoteAdatpterV2.prototype, "presenceHandler", null);
__decorate([
    socket_api_adapter_1.Handler(remote_presence_utils_1.PayloadType.PRESENCE_FIRST_PARTY),
    socket_api_adapter_1.FirstParty(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_api_adapter_1.SocketContext, Object]),
    __metadata("design:returntype", void 0)
], RemoteAdatpterV2.prototype, "firstPartyPresenceHandler", null);
__decorate([
    socket_api_adapter_1.Handler(remote_presence_utils_1.PayloadType.IDENTIFY),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_api_adapter_1.SocketContext, Object]),
    __metadata("design:returntype", Promise)
], RemoteAdatpterV2.prototype, "identificationHandler", null);
exports.RemoteAdatpterV2 = RemoteAdatpterV2;
