import log from "@presenti/logging";
import { API_ROUTES, OAUTH_PLATFORM, PresentiUser } from "@presenti/utils";
import { APIError, BodyParser, PBRequest, PBResponse, Put, RequestHandler, Route, RouteData, RouteDataShell } from "@presenti/web";
import { User } from "../../database/entities";
import { OAuthLink } from "../../database/entities/OAuthLink";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import { notFoundAPI } from "../canned-responses";
import { UserLoader } from "../loaders";
import { FirstPartyGuard, IdentityGuard } from "../middleware";
import PBRestAPIBase from "./foundation.util";

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

  @Put("/api/user/:id/platform", UserLoader(true), FirstPartyGuard, BodyParser)
  async establishLink(req: PBRequest, res: PBResponse) {
    const userID = req.getParameter(0);
    const { platform, linkID } = req.body;
    res.json(await PresentiAPI.linkPlatform(platform, linkID, userID));
  }

  static async linkPlatform(platform: OAUTH_PLATFORM, linkID: string, userID: string): Promise<{ ok: true } | APIError> {
    if (!platform || !linkID) return APIError.badRequest("The platform and link id are required.");
    if (!OAUTH_PLATFORM[platform]) return APIError.notFound("Unknown platform.");
    const user = await User.findOne({ userID });
    if (!user) return APIError.notFound("Unknown user.");

    await this.removeLinkIfExists(platform, linkID);
    
    const link = OAuthLink.create({ platform, linkID });
    link.user = user;
    await link.save();

    return { ok: true };
  }

  /**
   * Drops a given user/platform link
   * @param platform platform ID
   * @param linkID link ID
   * @param uuid user ID
   */
  static async dropLink(platform: OAUTH_PLATFORM, uuid: string): Promise<{ ok: true } | APIError> {
    if (!OAUTH_PLATFORM[platform]) return APIError.notFound("Unknown platform.");
    await OAuthLink.createQueryBuilder()
                   .delete()
                   .where("platform = :platform", { platform })
                   .andWhere("userUuid = :uuid", { uuid })
                   .execute();

    return { ok: true };
  }

  private static async removeLinkIfExists(platform: OAUTH_PLATFORM, linkID: string) {
    await OAuthLink.createQueryBuilder()
                   .delete()
                   .where("platform = :platform", { platform })
                   .andWhere("linkID = :linkID", { linkID })
                   .execute();
  }
}
