import log from "@presenti/logging";
import { API_ROUTES } from "@presenti/utils";
import { BodyParser, PBRequest, PBResponse, Put, RequestHandler, Route, RouteData, RouteDataShell } from "@presenti/web";
import { OAuthAPI } from "../../api/oauth";
import { UserAPI } from "../../api/user";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import { notFoundAPI } from "../canned-responses";
import { UserLoader } from "../middleware/loaders";
import { FirstPartyGuard, IdentityGuard } from "../middleware/guards";
import PBRestAPIBase from "../../structs/rest-api-base";

/** Users API */
export default class PresentiAPI extends PBRestAPIBase {
  log = log.child({ name: "PresentiAPI-REST" })

  loadRoutes() {
    super.loadRoutes();

    this.app.any('/api/*', this.buildHandler(RouteDataShell("/api/*"), (req, res) => {
      notFoundAPI(res);
    }));
  }

  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(metadata, middleware, headers.concat('authorization', 'host'));
  }

  /** Generates an API key, only accepts the identity cookie */
  @Route(API_ROUTES.API_KEY, "get", UserLoader(), IdentityGuard)
  async generateAPIKey(req: PBRequest, res: PBResponse) {
    const key = await res.user!.apiKey();

    res.json({ key });
  }

  /** Queries the database for a user with the given ID, accepts identity or authorization header */
  @Route("/api/users/:userID", "get", UserLoader(true))
  async lookupUser(req: PBRequest, res: PBResponse) {
    const userID = req.getParameter(0);
    const full = res.user === (FIRST_PARTY_SCOPE as any);
    
    const user = await UserAPI.lookupUser(userID, full, res.user?.userID);

    res.json(user);
  }

  /** Queries the database for a user with the given oauth link, accepts identity or authorization header */
  @Route("/api/users/lookup", "get", UserLoader(true))
  async lookupUserByPlatform(req: PBRequest, res: PBResponse) {
    const params = new URLSearchParams(req.getQuery());
    const platform = params.get("platform")?.toUpperCase(), linkID = params.get("id");
    const full = res.user === (FIRST_PARTY_SCOPE as any);

    const user = await OAuthAPI.lookupUserByPlatformID(platform as any, linkID!, full);

    res.json(user);
  }

  @Put("/api/user/:id/platform", UserLoader(true), FirstPartyGuard, BodyParser)
  async establishLink(req: PBRequest, res: PBResponse) {
    const userID = req.getParameter(0);
    const { platform, linkID } = req.body;
    res.json(await OAuthAPI.createLink(platform, linkID, userID));
  }
}
