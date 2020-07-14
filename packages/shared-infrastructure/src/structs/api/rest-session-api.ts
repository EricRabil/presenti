import log from "@presenti/logging";
import { AdapterState, FIRST_PARTY_SCOPE, APIError } from "@presenti/utils";
import { BodyParser, Delete, FirstPartyGuard, Get, PBRequest, PBResponse, Put, RequestHandler, RouteData, RestAPIBase } from "@presenti/web";
import { TemplatedApp } from "uWebSockets.js";
import { API } from "@presenti/modules";
import { RemoteRestAPIBase } from "../remote-rest-api-base";
import AuthClient from "@presenti/auth-client";

const clean = (str: string | null) => str?.replace(/(\r\n|\n|\r)/gm, "");

const SessionGuard: RequestHandler = async (req, res, next) => {
  const params = new URLSearchParams(req.getQuery());
  const token = clean(params.get("token"));
  const sessionID = clean(params.get("id"));

  if (!token || !sessionID) {
    res.writeStatus(400).json({ error: "Please provide a token and session ID." });
    return next(true);
  }

  const { user } = await AuthClient.sharedInstance.validateApiKey(token);

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
export class RESTPresenceAPI extends RestAPIBase {
  log = log.child({ name: "RESTPresenceAPI" })

  constructor(app: TemplatedApp, private adapter: RemoteRestAPIBase) {
    super(app);
  }

  @Get()
  async createSession(req: PBRequest, res: PBResponse) {
    const params = new URLSearchParams(req.getQuery());
    const token = clean(params.get('token'));

    if (!token) {
      res.writeStatus(400).json({ error: "Please provide a token." });
      return;
    }

    const { user } = await AuthClient.sharedInstance.validateApiKey(token);

    if (!user) {
      res.writeStatus(401).json({ error: "Invalid token." });
      return;
    }
    
    const sessionID = this.adapter.createSession(user.userID);

    res.json({
      sessionID,
      expires: this.adapter.sessionExpiryMS
    });
  }

  @Put("", SessionGuard, DenyFirstParties, BodyParser)
  async updateSession(req: PBRequest, res: PBResponse) {
    await this.updatePresence(this.adapter.sessionIndex[res.sessionID], req, res);
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
      res.json(APIError.malformed);
      return;
    }

    this.adapter.presenceLedger[res.sessionID][scope] = req.body.presences;

    res.json({ ok: true });
  }
}