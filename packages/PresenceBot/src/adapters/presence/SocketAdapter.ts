import { PayloadType, AdapterState, Presence, FirstPartyPresenceData } from "remote-presence-utils";
import { TemplatedApp } from "uWebSockets.js";
import { log } from "../../utils/logging";
import { SocketAPIAdapter, Handler, SocketContext, Authed, FIRST_PARTY_SCOPE, FirstParty, DenyFirstParty } from "../../structs/socket-api-base";
import { PresenceList, PresenceDictionary, PresenceMagic } from "../../utils/presence-magic";

export class RemoteAdatpterV2 extends SocketAPIAdapter {
  log = log.child({ name: "RemoteAdapterV2" });

  constructor(app: TemplatedApp) {
    super(app, '/remote');

    this.thirdPartyPresences = PresenceMagic.createPresenceDictCondenser(this.thirdPartyPresenceLedger);
    this.firstPartyPresences = PresenceMagic.createPresenceDictCondenser(this.firstPartyPresenceLedger);
  }

  /** Format of Record<socketID, Record<scope, PresenceList>> */
  firstPartyPresenceLedger: Record<string, PresenceDictionary> = {};

  /** Format of Record<socketID, Record<scope, PresenceList>> */
  thirdPartyPresenceLedger: Record<string, PresenceDictionary> = {};

  /** Object that merges all third-party presences into the format of Record<scope, PresenceList> */
  thirdPartyPresences: PresenceDictionary;

  /** Object that merges all first-party presences into the format of Record<scope, PresenceList> */
  firstPartyPresences: PresenceDictionary;


  run() {
    this.state = AdapterState.RUNNING;
  }

  @Handler(PayloadType.PRESENCE)
  @DenyFirstParty()
  @Authed()
  presenceHandler(ws: SocketContext, data: Presence) {
    const { scope } = ws;

    this.log.debug("Handling presence update for socket", { scope });

    if (!Array.isArray(data)) data = [data!];
    data = data.filter(p => !!p);

    this.thirdPartyPresenceLedger[ws.id][scope as string] = data;
  }

  @Handler(PayloadType.PRESENCE_FIRST_PARTY)
  @FirstParty()
  firstPartyPresenceHandler(ws: SocketContext, { scope, presence }: FirstPartyPresenceData) {
    if (!Array.isArray(presence)) presence = [presence];
    presence = presence.filter(p => !!p);
    
    this.firstPartyPresenceLedger[ws.id][scope] = presence as PresenceList;
  }

  /**
   * Called when the socket is closed. Tears down the presence ledger for that socket.
   * @param ctx socket context, or { id: string } if the context is already gone.
   */
  closed(id: string) {
    super.closed(id);

    const wasFirstParty = this.firstPartyPresenceLedger[id];
    var scopes: string[] = [];

    if (wasFirstParty && this.firstPartyPresenceLedger[id]) {
      scopes = Object.keys(this.firstPartyPresenceLedger[id]);
      delete this.firstPartyPresenceLedger[id];
    } else if (this.thirdPartyPresenceLedger[id]) {
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
  @Handler(PayloadType.IDENTIFY)
  async identificationHandler(ws: SocketContext, data: any) {
    const result = await super.identificationHandler(ws, data, false);
    if (!result) return false;

    this.log.debug("Initiated identifiaction handler");
    
    // After a socket has authenticated, generate a presence table for it.
    if (ws.firstParty) {
      this.firstPartyPresenceLedger[ws.id] = this.createPresenceTable();
      this.log.debug("Assigned first-party presence ledger for socket.", { socketID: ws.id });
    } else {
      this.thirdPartyPresenceLedger[ws.id] = this.createPresenceTable();
      this.log.debug("Assigned third-party presence ledger for socket.", { socketID: ws.id });
    }

    ws.send(PayloadType.GREETINGS);

    return true;
  }

  /**
   * Returns a list of presences for a scope
   * @param scope scope
   */
  activityForUser(scope: string) {
    const firstParty = this.firstPartyPresences[scope];

    // first-party presences override third-party presences.
    const exclude: string[] = firstParty.map(p => p.id!).filter(id => !!id);
    const thirdParty = this.thirdPartyPresences[scope].filter(({id}) => !exclude.includes(id!));

    return firstParty.concat(thirdParty);
  }

  async activities() {
    const firstPartyScopes = Object.values(this.firstPartyPresenceLedger).map(o => o && Object.keys(o)).filter(o => !!o);
    const thirdPartyScopes = Object.values(this.thirdPartyPresenceLedger).map(o => o && Object.keys(o)).filter(o => !!o);
    const activities = await Promise.all(firstPartyScopes.concat(thirdPartyScopes).reduce((a,c) => a.concat(c), []).filter((s,i,a) => a.indexOf(s) === i).map(async s => ({ scope: s, activities: this.activityForUser(s)})));
    return activities.reduce((acc, {scope, activities}) => Object.assign(acc, {[scope]: activities}), {});
  }

  /**
   * Creates a presence proxy that maps events to this adapter
   */
  private createPresenceTable() {
    return PresenceMagic.createPresenceProxy<Record<string, PresenceList>>(this.emit.bind(this, "updated"));
  }
}