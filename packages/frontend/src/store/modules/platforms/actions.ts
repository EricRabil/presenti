import { ActionContext } from "vuex";
import { PlatformState } from ".";
import apiClient from "@/api";

const getPlatforms = async (context: ActionContext<PlatformState, any>) => {
  const platforms = Object.values(await apiClient.platforms());
  context.commit("updatePlatforms", platforms);
  return platforms;
};

export default {
  getPlatforms
};
