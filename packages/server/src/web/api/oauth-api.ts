import fetch from "node-fetch";
import qs from "querystring";
import { OAUTH_PLATFORM } from "@presenti/utils";
import { PBRequest, PBResponse, Get } from "@presenti/web";
import { CONFIG } from "../../utils/config";
import log from "@presenti/logging";
import { notFoundAPI } from "../canned-responses";
import { UserLoader } from "../loaders";
import { DenyFirstPartyGuard, IdentityGuard } from "../middleware";
import PresentiAPIFoundation, { API, GlobalGuards } from "./foundation.util";
import { OAuthLink } from "../../database/entities/OAuthLink";
import PresentiAPI from "./api";

const DISCORD_REDIRECT = (host: string) => `http://${host}/api/oauth/discord/callback`;
const DISCORD_CALLBACK = (host: string) => `https://discordapp.com/api/oauth2/authorize?client_id=696639929605816371&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT(host))}&response_type=code&scope=identify`;

/** API for linking with OAuth services */
@API("/api/oauth")
@GlobalGuards(UserLoader(), IdentityGuard, DenyFirstPartyGuard)
export default class PresentiOAuthAPI extends PresentiAPIFoundation {
  log = log.child({ name: "OAuthAPI-REST" })

  /** Initialize Discord OAuth flow */
  @Get("/discord")
  async redirectToDiscord(req: PBRequest, res: PBResponse) {
    if (this.disableDiscordAPIs) return notFoundAPI(res);
    res.redirect(DISCORD_CALLBACK(req.getHeader('host')));
  }

  /** Unlink from Discord */
  @Get("/discord/unlink")
  async unlinkDiscord(req: PBRequest, res: PBResponse) {
    if (this.disableDiscordAPIs) return notFoundAPI(res);

    await this.removeLinkIfExists({
      platform: OAUTH_PLATFORM.DISCORD,
      userUUID: res.user!.uuid
    })
    
    res.redirect('/');
  }

  @Get("/unlink/:platform")
  async dropLink(req: PBRequest, res: PBResponse) {
    const platform = req.getParameter(0);

    res.json(await PresentiAPI.dropLink(platform as any, res.user!.uuid));
  }

  /**
   * Removes an OAuth query if it exists
   * @param query.platform the oauth platform to remove
   * @param query.userUUID the user to clear the link for
   */
  async removeLinkIfExists(query: {platform: OAUTH_PLATFORM, userUUID: string}) {
    const link = await OAuthLink.findOne(query);
    if (link) await link.remove();
  }

  /** Called by Discord upon OAuth completion */
  @Get("/discord/callback")
  async discordCallback(req: PBRequest, res: PBResponse) {
    if (this.disableDiscordAPIs) return notFoundAPI(res);
    const params = new URLSearchParams(req.getQuery());
    const code = params.get("code");

    if (!code) {
      res.writeStatus(400).json({ error: "Malformed OAuth callback." });
      return;
    }

    const data = await fetch("https://discordapp.com/api/v6/oauth2/token", {
      method: "post",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: qs.stringify({
        client_id: CONFIG.discord!.clientID,
        client_secret: CONFIG.discord!.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT(req.getHeader('host')),
        scope: 'identify'
      })
    }).then(r => r.json());

    if (!("token_type" in data && "access_token" in data)) {
      this.log.warn("Got an errored response upon oauth completion", { data, user: res.user!.uuid });
      return res.redirect('/');
    }
    
    const token = `${data.token_type} ${data.access_token}`;

    const { id } = await fetch("https://discordapp.com/api/v6/users/@me", {
      method: "get",
      headers: {
        'authorization': token
      }
    }).then(r => r.json());
    
    await this.removeLinkIfExists({
      platform: OAUTH_PLATFORM.DISCORD,
      userUUID: res.user!.uuid
    });

    const link = OAuthLink.create({
      platform: OAUTH_PLATFORM.DISCORD,
      linkID: id
    });
    link.user = res.user!;
    await link.save();
    
    res.redirect('/');
  }

  /** Whether Discord OAuth APIs should be enabled */
  get disableDiscordAPIs() {
    return !CONFIG.discord || !CONFIG.discord.clientID || !CONFIG.discord.clientSecret;
  }
}