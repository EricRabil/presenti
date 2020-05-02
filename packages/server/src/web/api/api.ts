import { API_ROUTES, OAUTH_PLATFORM, PresentiUser } from "@presenti/utils";
import { User } from "../../database/entities";
import RestAPIBase, { Route, RouteDataShell } from "../../structs/rest-api-base";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import log from "../../utils/logging";
import { BodyParser } from "../../utils/web/shared-middleware";
import { PBRequest, PBResponse, RequestHandler } from "../../utils/web/types";
import { RouteData, APIError } from "../../utils/web/utils";
import { notFoundAPI } from "../canned-responses";
import { UserLoader } from "../loaders";
import { DenyFirstPartyGuard, FirstPartyGuard, IdentityGuard } from "../middleware";
import { OAuthLink } from "../../database/entities/OAuthLink";

/** Users API */
export default class PresentiAPI extends RestAPIBase {
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
    
    const user = await PresentiAPI.userQuery(userID, full, res.user?.userID);

    res.json(user);
  }

  static async userQuery(userID: string, full: boolean = false, queryingUser: string | null = null): Promise<PresentiUser | APIError> {
    const user = await User.findOne({ userID });
    if (!user) {
      return APIError.notFound("Unknown user.");
    }
    
    return user.json(full || (user.userID === queryingUser));
  }

  /** Queries the database for a user with the given oauth link, accepts identity or authorization header */
  @Route("/api/users/lookup", "get", UserLoader(true))
  async lookupUserByPlatform(req: PBRequest, res: PBResponse) {
    const params = new URLSearchParams(req.getQuery());
    const platform = params.get("platform")?.toUpperCase(), linkID = params.get("id");
    const full = res.user === (FIRST_PARTY_SCOPE as any);

    const user = await PresentiAPI.platformLookup(platform as any, linkID!, full);

    res.json(user);
  }

  static async platformLookup(platform: OAUTH_PLATFORM, linkID: string, full: boolean = false): Promise<PresentiUser | APIError> {
    if (!platform || !linkID) return APIError.badRequest("The platform and link id are required.");
    if (!OAUTH_PLATFORM[platform]) return APIError.notFound("Unknown platform.");

    const link = await OAuthLink.findOne({
      platform,
      linkID
    });
    if (!link) return APIError.notFound("Unknown link.");

    const user = await User.findOne({
      uuid: link.userUUID
    });
    if (!user) return APIError.internal("Broken link.");

    return user.json(full);
  }
}
