import { DiscordAdapterOptions } from "../adapters/DiscordAdapter";
import { SpotifyInternalKit } from "../adapters/utils/SpotifyInternalKit";

export interface PresentiAdditionsConfig {
  discord: DiscordAdapterOptions;
  spotifyInternal: SpotifyInternalKit.SpotifyInternalConfig;
}