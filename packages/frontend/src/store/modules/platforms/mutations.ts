import { PlatformState } from ".";
import { OAuthModuleDefinition } from "@presenti/utils";

const updatePlatforms = (state: PlatformState, platforms: OAuthModuleDefinition[]) => {
  state.platforms = platforms;
};

export default {
  updatePlatforms
};
