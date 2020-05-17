import Vue from "vue";
import Vuex from "vuex";
import createPersistedState from "vuex-persistedstate";
import userModule from "./modules/user";
import routerModule from "./modules/router";
import platformsModule from "./modules/platforms";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {

  },
  mutations: {
  },
  actions: {
  },
  modules: {
    user: userModule,
    router: routerModule,
    platforms: platformsModule
  },
  plugins: [
    createPersistedState({
      paths: ["user"]
    })
  ]
});
