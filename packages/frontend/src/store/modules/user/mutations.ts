import Vue from "vue";
import { PresentiUser, OAUTH_PLATFORM, PresentiLink } from "@presenti/utils";
import { UserState } from ".";

const update = (state: UserState, user: PresentiUser | null) => {
  state.model = user;
};

const removePlatform = (state: UserState, platform: OAUTH_PLATFORM) => {
  if (!state.model || !state.model.platforms) { return; }
  Vue.delete(state.model.platforms, platform);
  Vue.delete(state.model.platforms, OAUTH_PLATFORM[platform]);
};

const addPlatform = (state: UserState, { platform, data }: { platform: OAUTH_PLATFORM, data: PresentiLink }) => {
  if (!state.model || !state.model.platforms) { return; }
  Vue.set(state.model.platforms, typeof platform === "string" ? platform : OAUTH_PLATFORM[platform], data);
};

export default {
  update,
  removePlatform,
  addPlatform
};
