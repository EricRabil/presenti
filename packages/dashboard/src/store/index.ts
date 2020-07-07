import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist';

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    infuseColor: true,
    transforms: {},
    positions: {}
  },
  mutations: {
    setTransform(state, payload) {
      Vue.set(state, "transforms", Object.assign({}, state.transforms, payload));
    },
    setPosition(state, payload) {
      Vue.set(state, "positions", Object.assign({}, state.positions, payload));
    }
  },
  actions: {
  },
  getters: {
    transforms(state) {
      return state.transforms;
    },
    positions(state) {
      return state.positions;
    }
  },
  modules: {
  },
  plugins: [
    new VuexPersistence<{}>({
      storage: window.localStorage
    }).plugin
  ]
});
