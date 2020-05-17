import actions from "./actions";
import getters from "./getters";
import mutations from "./mutations";

export interface RouterState {
  loginRedirect: string | null;
}

const state: RouterState = {
  loginRedirect: null
};

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations
};
