import actions from "./actions";
import getters from "./getters";
import mutations from "./mutations";
import { OAuthModuleDefinition } from "@presenti/utils";

export interface PlatformState {
  platforms: OAuthModuleDefinition[];
}

const state: PlatformState = {
  platforms: []
};

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations
};
