import log from "@presenti/logging";
import { OAUTH_PLATFORM } from "@presenti/utils";
import { Get, PBRequest, PBResponse } from "@presenti/web";
import fetch from "node-fetch";
import qs from "querystring";
import { OAuthAPI } from "../../api/oauth";
import { CONFIG } from "../../utils/config";
import PBRestAPIBase, { API, GlobalGuards } from "../../structs/rest-api-base";
import { notFoundAPI } from "../canned-responses";
import { UserLoader } from "../middleware/loaders";
import { DenyFirstPartyGuard, IdentityGuard } from "../middleware/guards";

const DISCORD_REDIRECT = (host: string) => `http://${host}/api/oauth/discord/callback`;
const DISCORD_CALLBACK = (host: string) => `https://discordapp.com/api/oauth2/authorize?client_id=696639929605816371&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT(host))}&response_type=code&scope=identify`;

/** API for linking with OAuth services */
@API("/api/oauth")
@GlobalGuards(UserLoader(), IdentityGuard, DenyFirstPartyGuard)
export default class PresentiOAuthAPI extends PBRestAPIBase {
  log = log.child({ name: "OAuthAPI-REST" })

  @Get("/unlink/:platform")
  async dropLink(req: PBRequest, res: PBResponse) {
    const platform = req.getParameter(0);

    res.json(await OAuthAPI.deleteLink({
      platform: platform as any,
      userUUID: res.user!.uuid
    }));
  }
}