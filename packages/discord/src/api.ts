import logger from "@presenti/logging";
import { API, GlobalGuards } from "@presenti/modules";
import { OAUTH_PLATFORM, PresentiAPI } from "@presenti/utils";
import { DenyFirstPartyGuard, Get, IdentityGuard, PBRequest, PBResponse, UserLoader, RestAPIBase } from "@presenti/web";
import { Client } from 'discord.js';
import qs from "querystring";
import { TemplatedApp } from "uWebSockets.js";
import { DiscordAdapter } from "./adapter";
import { DiscordAdapterOptions } from "./types";

const DISCORD_REDIRECT = (host: string) => `http${host}/api/oauth/discord/callback`;
const DISCORD_CALLBACK = (host: string) => `https://discord.com/api/oauth2/authorize?client_id=696639929605816371&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT(host))}&response_type=code&scope=guilds.join%20identify`;

/** API for linking with OAuth services */
@API("/api/oauth")
@GlobalGuards(UserLoader(true), IdentityGuard, DenyFirstPartyGuard)
export default class DiscordOAuthAPI extends RestAPIBase {
  constructor(app: TemplatedApp, private client: PresentiAPI, private config: DiscordAdapterOptions) {
    super(app);
  }

  log = logger.child({ name: "DiscordAPI" })

  /** Initialize Discord OAuth flow */
  @Get("/discord")
  async redirectToDiscord(req: PBRequest, res: PBResponse) {
    res.json({ url: DISCORD_CALLBACK(req.server!.config.web.host) });
  }

  /** Unlink from Discord */
  @Get("/discord/unlink")
  async unlinkDiscord(req: PBRequest, res: PBResponse) {
    await this.client.deleteLink({
      platform: OAUTH_PLATFORM.DISCORD,
      userUUID: res.user.uuid
    });
    
    res.json({ ok: true });
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

    const data = await fetch("https://discord.com/api/v6/oauth2/token", {
      method: "post",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: qs.stringify({
        client_id: this.config.clientID,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT(req.server!.config.web.host),
        scope: 'guilds.join identify'
      })
    }).then(r => r.json());

    if (!("token_type" in data && "access_token" in data)) {
      this.log.warning("Got an errored response upon oauth completion", { data, user: res.user.uuid });
      return res.redirect('/');
    }
    
    const token = `${data.token_type} ${data.access_token}`;

    const { id } = await fetch("https://discord.com/api/v6/users/@me", {
      method: "get",
      headers: {
        'authorization': token
      }
    }).then(r => r.json());
    
    await this.client.deleteLink({
      platform: OAUTH_PLATFORM.DISCORD,
      userUUID: res.user.uuid
    });

    await this.client.createLink({
      platform: OAUTH_PLATFORM.DISCORD,
      platformID: id,
      userUUID: res.user.uuid
    });

    /** Add federated user to the presence guild */
    if (this.guild) {
      await fetch(`https://discord.com/api/v6/guilds/${this.guild.id}/members/${id}`, {
        method: "put",
        headers: {
          'authorization': `Bot ${this.discordClient!.token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          access_token: data.access_token
        })
      });
    }
    
    res.redirect(req.server!.config.web.oauthSuccessRedirect);
  }

  get guild() {
    return this.discordClient?.guilds.cache.first();
  }

  get discordClient(): Client | undefined {
    return DiscordAdapter.sharedAdapter?.client;
  }
}