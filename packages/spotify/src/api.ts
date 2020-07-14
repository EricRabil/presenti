import { PresenceOutput, PresenceProvider } from "@presenti/modules";
import { TemplatedApp } from "uWebSockets.js";
import { API, GlobalGuards } from "@presenti/modules";
import { IdentityGuard, DenyFirstPartyGuard, RestAPIBase } from "@presenti/web";
import { PresentiAPIClient, OAUTH_PLATFORM, PipeDirection, APIError } from "@presenti/utils";
import { Post, PBRequest, PBResponse, BodyParser, UserLoader } from "@presenti/web";
import { SpotifyInternalKit } from "./utils/SpotifyInternalKit";
import { PresentiAPI } from "@presenti/utils";

@API("/api/spotify")
@GlobalGuards(UserLoader(true), IdentityGuard, DenyFirstPartyGuard)
export class SpotifyLinkAPI extends RestAPIBase {
  constructor(app: TemplatedApp, private client: PresentiAPI) {
    super(app);
  }

  @Post("/link", BodyParser)
  async linkSpotify(req: PBRequest, res: PBResponse) {
    const { userEntry } = req.body;
    if (!userEntry || typeof userEntry !== "string" || userEntry.length < 1) return res.json(APIError.badRequest("Please provide a valid set of Spotify cookies."));

    const result = await this.pipePrivateSpotify(res.user.uuid, userEntry);
    res.json(result || APIError.badRequest("Couldn't create link."));
  }

  async pipePrivateSpotify(userUUID: string, cookies: string) {
    await this.unpipePrivateSpotify(userUUID);

    const link = await this.client.createLink({
      platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
      platformID: await SpotifyInternalKit.encryptCookies(cookies),
      pipeDirection: PipeDirection.NOWHERE,
      userUUID
    });
    
    return link;
  }

  async unpipePrivateSpotify(userUUID: string) {
    try {
      await this.client.deleteLink({
        platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
        userUUID
      });
    } catch (e) {
      if (e instanceof APIError) {
        if (e.code === 404) return;
      }
      throw e;
    }
  }
}
