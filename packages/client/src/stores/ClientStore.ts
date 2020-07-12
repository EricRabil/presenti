import { OAuthModuleDefinition } from "@presenti/utils";

export class ClientStore {
  platforms: Record<string, OAuthModuleDefinition> = {};

  constructor() {

  }

  setPlatforms(platforms: OAuthModuleDefinition[]): this["platforms"] {
    return this.platforms = platforms.reduce((acc, platform) => Object.assign(acc, { [platform.key]: platform }), {});
  }
}