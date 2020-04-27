import RestAPIBase, { Route } from "../structs/rest-api-base";
import { RequestHandler, PBRequest, PBResponse } from "../utils/web/types";
import { IdentityGuard, DenyFirstPartyGuard, FirstPartyGuard } from "./middleware";
import { UserLoader } from "./loaders";
import { API_ROUTES } from "remote-presence-utils";
import { BodyParser } from "../utils/web/shared-middleware";
import { User } from "../database/entities";

export default class PresentiAPI extends RestAPIBase {
  loadRoutes() {
    super.loadRoutes();

    this.app.any('/api/*', this.buildHandler((req, res) => {
      res.writeStatus(404).json({ error: "Unknown endpoint." });
    }));
  }

  buildStack(middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(middleware, headers.concat('authorization'));
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
}