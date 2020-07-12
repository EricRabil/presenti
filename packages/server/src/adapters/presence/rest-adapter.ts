import log from "@presenti/logging";
import { ScopedPresenceAdapter } from "@presenti/modules";
import { AdapterState, PresenceDictionary, PresenceList, FIRST_PARTY_SCOPE } from "@presenti/utils";
import * as uuid from "uuid";
import { TemplatedApp } from "uWebSockets.js";
import { User } from "@presenti/shared-db";
import { PresenceTools } from "@presenti/utils";
import { RESTPresenceAPI } from "./api/rest-session-api";

export class RESTAdapterV2 extends ScopedPresenceAdapter {
  /**
   * By default, the session will expire in five minutes.
   */
  static DEFAULT_EXPIRY_MS = 1000 * 60 * 5;

  /** Format of Record<sessionID, scope> */
  sessionIndex: Record<string, string> = {};

  /** Format of Record<sessionID, number> */
  expirationTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

  /** Format of Record<sessionID, PresenceList> */
  presenceLedger: Record<string, PresenceDictionary> = {};
  presences: PresenceDictionary;

  sessionExpiryMS = RESTAdapterV2.DEFAULT_EXPIRY_MS;
  api: RESTPresenceAPI;
  log = log.child({ name: "RestAdapterV2" });

  constructor(app: TemplatedApp) {
    super();
    this.api = new RESTPresenceAPI(app, this);
    this.presences = PresenceTools.createPresenceDictCondenser(this.presenceLedger);
  }

  /**
   * Creates a session for the given user, returning the session ID
   * @param user user ID
   */
  createSession(user: User | string | typeof FIRST_PARTY_SCOPE): string {
    const sessionID = uuid.v4();

    if (user instanceof User) {
      user = user.userID;
    }

    this.log.debug("Creating session", { sessionID, user });

    this.sessionIndex[sessionID] = user as string;
    this.presenceLedger[sessionID] = this.createPresenceTable();
    this.scheduleExpiry(sessionID);

    return sessionID;
  }

  /**
   * Destroys a given session
   * @param session session ID
   */
  destroySession(session: string) {
    this.log.debug("Destroying session", { sessionID: session, user: this.sessionIndex[session] });

    const keys = Object.keys(this.presenceLedger[session]);

    this.clearExpiry(session);
    this.sessionIndex[session] = undefined!;
    this.presenceLedger[session] = undefined!;

    keys.forEach(scope => this.emit("updated", scope));
  }
  
  /**
   * Clears the expiration timeout for a session
   * @param session session ID
   */
  clearExpiry(session: string) {
    if (this.expirationTimeouts[session]) clearTimeout(this.expirationTimeouts[session]);
  }

  /**
   * Schedules a deferred expiration of a session using the configured expiration
   * @param session session ID
   */
  scheduleExpiry(session: string): void {
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
  sessionCanUpdateScope(sessionID: string, scope: string) {
    return this.sessionIndex[sessionID] === scope || this.sessionIndex[sessionID] === (FIRST_PARTY_SCOPE as any);
  }

  async activityForUser(id: string) {
    return this.presences[id];
  }

  async activities() {
    const activities = await Promise.all(Object.values(this.sessionIndex).filter((u,i,a) => a.indexOf(u) === i).map(async u => ({ user: u, presence: await this.activityForUser(u) })));
    return activities.reduce((acc, {user, presence}) => Object.assign(acc, { [user]: presence }), {} as PresenceDictionary);
  }

  run() {
    this.api.run();
    this.state = AdapterState.RUNNING;
    this.log.info("REST Presence API is running.");
  }

  /**
   * Creates a presence proxy that maps events to this adapter
   */
  private createPresenceTable() {
    return PresenceTools.createPresenceProxy<Record<string, PresenceList>>(scope => this.emit("updated", scope));
  }
}