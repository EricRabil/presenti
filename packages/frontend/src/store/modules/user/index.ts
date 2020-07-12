import { PresentiUser } from "@presenti/utils";
import actions from "./actions";
import getters from "./getters";
import mutations from "./mutations";

export interface UserState {
  model: PresentiUser | undefined | null;
}

const state: UserState = {
  model: undefined
};

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations
};
