import { OAUTH_PLATFORM } from "@presenti/utils";
import { PresentiOAuthDefinition } from "@presenti/modules/src";

export * as Adapters from "./adapters";
export * as Entities from "./db/entities";
export * as Outputs from "./outputs";

export const OAuth: PresentiOAuthDefinition[] = [{
  asset: "discord",
  key: OAUTH_PLATFORM.DISCORD,
  name: "Discord",
  link: "/api/oauth/discord",
  unlink: "/api/oauth/discord/unlink",
  schema: {
    type: "oauth"
  }
}, {
  asset: "spotify",
  key: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
  name: "Spotify (Internal)",
  link: "/api/spotify/link",
  unlink: "/api/spotify/unlink",
  schema: {
    type: "entry",
    contentsVisible: false
  }
}];