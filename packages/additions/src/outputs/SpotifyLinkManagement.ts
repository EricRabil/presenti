import { PresenceOutput, PresenceProvider } from "@presenti/modules";
import { TemplatedApp } from "uWebSockets.js";
import { PresentiAdditionsConfig } from "../structs/config";
import PBRestAPIBase, { API, GlobalGuards } from "@presenti/server/dist/structs/rest-api-base";
import { UserLoader } from "@presenti/server/dist/web/middleware/loaders";
import { IdentityGuard, DenyFirstPartyGuard } from "@presenti/server/dist/web/middleware/guards";
import { PresentiAPIClient, OAUTH_PLATFORM, PipeDirection } from "@presenti/utils";
import { Post, PBRequest, PBResponse, BodyParser, APIError } from "@presenti/web";
import { SpotifyInternalKit } from "../adapters/utils/SpotifyInternalKit";

@API("/api/spotify")
@GlobalGuards(UserLoader(true), IdentityGuard, DenyFirstPartyGuard)
class SpotifyLinkAPI extends PBRestAPIBase {
  constructor(app: TemplatedApp, private client: PresentiAPIClient, private config: PresentiAdditionsConfig) {
    super(app);
  }

  @Post("/link", BodyParser)
  async linkSpotify(req: PBRequest, res: PBResponse) {
    const { userEntry } = req.body;
    if (!userEntry || typeof userEntry !== "string" || userEntry.length < 1) return res.json(APIError.badRequest("Please provide a valid set of Spotify cookies."));

    const result = await this.pipePrivateSpotify(res.user!.uuid, userEntry);
    res.json(result || APIError.badRequest("Couldn't create link."));
  }

  async pipePrivateSpotify(userUUID: string, cookies: string) {
    await this.unpipePrivateSpotify(userUUID);

    const link = await this.client.createLink({
      platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
      platformID: await SpotifyInternalKit.encryptCookies(cookies, this.config.spotifyInternal),
      pipeDirection: PipeDirection.NOWHERE,
      userUUID
    });
    
    return link;
  }

  async unpipePrivateSpotify(userUUID: string) {
    await this.client.deleteLink({
      platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
      userUUID
    });
  }
}

export class SpotifyLinkOutput extends PresenceOutput {
  constructor(provider: PresenceProvider, app: TemplatedApp, config: PresentiAdditionsConfig) {
    super(provider, app);
    this.api = new SpotifyLinkAPI(app, provider.client, config);
  }
}