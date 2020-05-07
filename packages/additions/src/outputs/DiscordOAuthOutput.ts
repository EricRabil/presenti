import { PresenceOutput, PresenceProvider } from "@presenti/modules";
import log from "@presenti/logging";
import { OAUTH_PLATFORM, PresentiAPIClient } from "@presenti/utils";
import { Get, PBRequest, PBResponse } from "@presenti/web";
import fetch from "node-fetch";
import qs from "querystring";
import PBRestAPIBase, { API, GlobalGuards } from "@presenti/server/dist/structs/rest-api-base";
import { UserLoader } from "@presenti/server/dist/web/middleware/loaders";
import { DenyFirstPartyGuard, IdentityGuard } from "@presenti/server/dist/web/middleware/guards";
import { TemplatedApp } from "uWebSockets.js";
import { PresentiAdditionsConfig } from "../structs/config";

const DISCORD_REDIRECT = (host: string) => `http://${host}/api/oauth/discord/callback`;
const DISCORD_CALLBACK = (host: string) => `https://discordapp.com/api/oauth2/authorize?client_id=696639929605816371&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT(host))}&response_type=code&scope=identify`;

/** API for linking with OAuth services */
@API("/api/oauth")
@GlobalGuards(UserLoader(), IdentityGuard, DenyFirstPartyGuard)
export default class DiscordOAuthAPI extends PBRestAPIBase {
  constructor(app: TemplatedApp, private client: PresentiAPIClient, private config: PresentiAdditionsConfig) {
    super(app);
  }

  log = log.child({ name: "OAuthAPI-REST" })

  /** Initialize Discord OAuth flow */
  @Get("/discord")
  async redirectToDiscord(req: PBRequest, res: PBResponse) {
    res.redirect(DISCORD_CALLBACK(req.getHeader('host')));
  }

  /** Unlink from Discord */
  @Get("/discord/unlink")
  async unlinkDiscord(req: PBRequest, res: PBResponse) {
    await this.client.deleteLink({
      platform: OAUTH_PLATFORM.DISCORD,
      userUUID: res.user!.uuid
    });
    
    res.redirect('/');
  }
  
  /** Called by Discord upon OAuth completion */
  @Get("/discord/callback")
  async discordCallback(req: PBRequest, res: PBResponse) {
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
        client_id: this.config.discord.clientID,
        client_secret: this.config.discord.clientSecret,
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
    
    await this.client.deleteLink({
      platform: OAUTH_PLATFORM.DISCORD,
      userUUID: res.user!.uuid
    });

    await this.client.createLink({
      platform: OAUTH_PLATFORM.DISCORD,
      platformID: id,
      userUUID: res.user!.uuid
    });
    
    res.redirect('/');
  }
}

export class DiscordOAuthOutput extends PresenceOutput {
  constructor(provider: PresenceProvider, app: TemplatedApp, config: PresentiAdditionsConfig) {
    super(provider, app);
    this.api = new DiscordOAuthAPI(app, provider.client, config);
  }
}