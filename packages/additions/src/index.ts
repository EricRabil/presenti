import { OAUTH_PLATFORM } from "@presenti/utils";

export * as Adapters from "./adapters";
export * as Entities from "./db/entities";
export * as Outputs from "./outputs";

export const OAuth = [{
  asset: "/assets/img/discord.svg",
  key: OAUTH_PLATFORM.DISCORD,
  name: "Discord",
  link: "/api/oauth/discord",
  unlink: "/api/oauth/discord/unlink"
}]