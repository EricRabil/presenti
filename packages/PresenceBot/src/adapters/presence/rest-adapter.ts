import RestAPIBase, { Route } from "../../structs/rest-api-base";
import { PBRequest, PBResponse, RequestHandler } from "../../utils/web/types";
import { ScopedPresenceAdapter } from "../../structs/scoped-adapter";
import { TemplatedApp } from "uWebSockets.js";
import { PresenceList, PresenceDictionary, PresenceMagic } from "../../utils/presence-magic";
import { AdapterState, PresenceStruct } from "remote-presence-utils";
import * as uuid from "uuid";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import { SecurityKit } from "../../utils/security";
import { User } from "../../database/entities";
import { log } from "../../utils/logging";
import { BodyParser } from "../../utils/web/shared-middleware";
import { FirstPartyGuard } from "../../web/middleware";
import { RouteData } from "../../utils/web/utils";

const InsertAdapterGuard: (generator: () => RESTAdapterV2) => RequestHandler = (generator) => (req, res, next) => {
  res.adapter = generator();
  next();
}

const AdapterRunningGuard: RequestHandler = (req, res, next) => {
  if (res.adapter?.state !== AdapterState.RUNNING) {
    res.writeStatus(502).json({ error: "The REST service is not running yet." });
    return next(true);
  }
  next();
}

const clean = (str: string | null) => str?.replace(/(\r\n|\n|\r)/gm, "");

const SessionGuard: RequestHandler = async (req, res, next) => {
  const params = new URLSearchParams(req.getQuery());
  const token = clean(params.get("token"));
  const sessionID = clean(params.get("id"));

  if (!token || !sessionID) {
    res.writeStatus(400).json({ error: "Please provide a token and session ID." });
    return next(true);
  }

  const user = await SecurityKit.validateApiKey(token);

  if (!user || !res.adapter?.sessionIndex[sessionID]) {
    res.writeStatus(401).json({ error: "Invalid session or token." });
    return next(true);
  }
  
  if (user instanceof User) {
    res.user = user;
  }
  res.sessionID = sessionID;
  next();
}

const DenyFirstParties: RequestHandler = (req, res, next) => {
  const { adapter, sessionID } = res;
  if (adapter.sessionIndex?.sessionID === FIRST_PARTY_SCOPE) {
    res.writeStatus(400).json({ error: "First parties are not permitted to use this endpoint." });
    return next(true);
  }
  
  next();
}

export class RESTPresenceAPI extends RestAPIBase {
  log = log.child({ name: "RESTPresenceAPI" })

  constructor(app: TemplatedApp, private adapter: RESTAdapterV2) {
    super(app);
  }

  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(metadata, [InsertAdapterGuard(() => this.adapter), AdapterRunningGuard].concat(middleware), headers);
  }

  @Route("/session", "get")
  async createSession(req: PBRequest, res: PBResponse) {
    const params = new URLSearchParams(req.getQuery());
    const token = clean(params.get('token'));

    if (!token) {
      res.writeStatus(400).json({ error: "Please provide a token." });
      return;
    }

    const user = await SecurityKit.validateApiKey(token);

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

  @Route("/session", "put", SessionGuard, DenyFirstParties, BodyParser)
  async updateSession(req: PBRequest, res: PBResponse) {
    await this.updatePresence(res.adapter.sessionIndex[res.sessionID], req, res);
  }

  @Route("/session/:scope", "put", SessionGuard, FirstPartyGuard, BodyParser)
  async updateSessionScope(req: PBRequest, res: PBResponse) {
    await this.updatePresence(req.getParameter(0), req, res);
  }

  @Route("/session/refresh", "put", SessionGuard)
  async refreshSession(req: PBRequest, res: PBResponse) {
    const { sessionID } = res;

    res.adapter.scheduleExpiry(sessionID);

    res.json({ ok: true });
  }

  private async updatePresence(scope: string, req: PBRequest, res: PBResponse) {
    if (!req.body?.presences) {
      res.writeStatus(400).json({ error: "Malformed body data." });
      return;
    }

    res.adapter.presenceLedger[res.sessionID][scope] = req.body.presences;

    res.json({ ok: true });
  }
}

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

  sessionExpiryMS = RESTAdapterV2.DEFAULT_EXPIRY_MS;
  api: RESTPresenceAPI;
  log = log.child({ name: "RestAdapterV2" });

  constructor(app: TemplatedApp) {
    super();
    this.api = new RESTPresenceAPI(app, this);
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

    this.clearExpiry(session);
    this.sessionIndex[session] = undefined!;
    this.presenceLedger[session] = undefined!;
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
    const activities = Object.entries(this.sessionIndex).filter(([, user]) => user === id).map(([session]) => this.presenceLedger[session][id]).reduce((a, c) => a.concat(c), []);
    return activities;
  }

  async activities() {
    const activities = await Promise.all(Object.values(this.sessionIndex).filter((u,i,a) => a.indexOf(u) === i).map(async u => ({ user: u, presence: await this.activityForUser(u) })));
    return activities.reduce((acc, {user, presence}) => Object.assign(acc, { [user]: presence }), {} as PresenceDictionary);
  }

  run() {
    this.state = AdapterState.RUNNING;
    this.log.info("REST Presence API is running.");
  }

  /**
   * Creates a presence proxy that maps events to this adapter
   */
  private createPresenceTable() {
    return PresenceMagic.createPresenceProxy<Record<string, PresenceList>>(scope => this.emit("updated", scope));
  }
}