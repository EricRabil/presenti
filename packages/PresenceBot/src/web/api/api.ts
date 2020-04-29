import { API_ROUTES, OAUTH_PLATFORM } from "remote-presence-utils";
import { User } from "../../database/entities";
import RestAPIBase, { Route, RouteDataShell } from "../../structs/rest-api-base";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import log from "../../utils/logging";
import { BodyParser } from "../../utils/web/shared-middleware";
import { PBRequest, PBResponse, RequestHandler } from "../../utils/web/types";
import { RouteData } from "../../utils/web/utils";
import { notFoundAPI } from "../canned-responses";
import { UserLoader } from "../loaders";
import { DenyFirstPartyGuard, FirstPartyGuard, IdentityGuard } from "../middleware";
import { OAuthLink } from "../../database/entities/OAuthLink";

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

  @Route(API_ROUTES.GENERATE_LINK_CODE, "get", UserLoader(), IdentityGuard, DenyFirstPartyGuard)
  async generateLinkCode(req: PBRequest, res: PBResponse) {
    const code = await res.user!.linkCode();

    res.json({ code });
  }

  @Route(API_ROUTES.LINK_CODE, "post", UserLoader(true), BodyParser, FirstPartyGuard)
  async validateLinkCode(req: PBRequest, res: PBResponse) {
    const { scope, code } = req.body || {};

    if (!scope || !code) {
      return res.writeStatus(400).json({ error: "The 'scope' and 'code' properties are required." });
    }

    const user = await User.findOne({ userID: scope });

    if (!user) {
      return res.writeStatus(404).json({ error: "No user matches that scope." });
    }

    return res.json({ valid: await user.testLinkCode(code) })
  }

  @Route(API_ROUTES.API_KEY, "get", UserLoader(), IdentityGuard)
  async generateAPIKey(req: PBRequest, res: PBResponse) {
    const components = new URLSearchParams(req.getQuery());

    const key = await res.user!.apiKey();

    res.json({ key });
  }

  @Route("/api/users/:userID", "get", UserLoader(true))
  async lookupUser(req: PBRequest, res: PBResponse) {
    const userID = req.getParameter(0);
    const full = res.user === (FIRST_PARTY_SCOPE as any);
    
    const user = await User.findOne({ userID });
    if (!user) {
      return res.writeStatus(404).json({ error: "Unknown user." });
    }

    res.json(user.json(full || (userID === user.userID)));
  }

  @Route("/api/users/lookup", "get", UserLoader(true))
  async lookupUserByPlatform(req: PBRequest, res: PBResponse) {
    const params = new URLSearchParams(req.getQuery());
    const platform = params.get("platform")?.toUpperCase(), linkID = params.get("id");
    const full = res.user === (FIRST_PARTY_SCOPE as any);
    if (!platform || !linkID) return res.error("The platform and link id are required.");
    if (!OAUTH_PLATFORM[platform]) return res.error("Unknown platform.", 404);

    const link = await OAuthLink.findOne({
      platform: platform as any,
      linkID
    });
    if (!link) return res.error("Unknown link.", 404);

    const user = await User.findOne({
      uuid: link.userUUID
    });

    if (!user) return res.error("Broken link.", 500);

    res.json(user.json(full || (res.user?.uuid === user.uuid)));
  }
}
