import log from "@presenti/logging";
import { AdapterState } from "@presenti/utils";
import { BodyParser, Delete, Get, PBRequest, PBResponse, Put, RequestHandler, RouteData } from "@presenti/web";
import { TemplatedApp } from "uWebSockets.js";
import PBRestAPIBase, { API } from "../../../structs/rest-api-base";
import { FIRST_PARTY_SCOPE } from "../../../structs/socket-api-base";
import { SecurityKit } from "../../../utils/security";
import { FirstPartyGuard } from "../../../web/middleware/guards";
import { RESTAdapterV2 } from "../rest-adapter";

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
  
  res.user = user;
  res.sessionID = sessionID;
  next();
}

const DenyFirstParties: RequestHandler = (req, res, next) => {
  const { adapter, sessionID } = res;
  if (adapter.sessionIndex[sessionID] === FIRST_PARTY_SCOPE as any) {
    res.writeStatus(400).json({ error: "First parties are not permitted to use this endpoint." });
    return next(true);
  }
  
  next();
}

@API("/api/session")
export class RESTPresenceAPI extends PBRestAPIBase {
  log = log.child({ name: "RESTPresenceAPI" })

  constructor(app: TemplatedApp, private adapter: RESTAdapterV2) {
    super(app);
  }

  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(metadata, [InsertAdapterGuard(() => this.adapter), AdapterRunningGuard].concat(middleware), headers);
  }

  @Get()
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

  @Put("", SessionGuard, DenyFirstParties, BodyParser)
  async updateSession(req: PBRequest, res: PBResponse) {
    await this.updatePresence(res.adapter.sessionIndex[res.sessionID], req, res);
  }

  @Delete("", SessionGuard)
  async endSession(req: PBRequest, res: PBResponse) {
    this.adapter.destroySession(res.sessionID);

    res.json({ ok: true });
  }

  @Put("/:scope", SessionGuard, FirstPartyGuard, BodyParser)
  async updateSessionScope(req: PBRequest, res: PBResponse) {
    await this.updatePresence(req.getParameter(0), req, res);
  }

  @Put("/refresh", SessionGuard)
  async refreshSession(req: PBRequest, res: PBResponse) {
    const { sessionID } = res;

    this.adapter.scheduleExpiry(sessionID);

    res.json({ ok: true });
  }

  private async updatePresence(scope: string, req: PBRequest, res: PBResponse) {
    if (!req.body?.presences) {
      res.writeStatus(400).json({ error: "Malformed body data." });
      return;
    }

    this.adapter.presenceLedger[res.sessionID][scope] = req.body.presences;

    res.json({ ok: true });
  }
}