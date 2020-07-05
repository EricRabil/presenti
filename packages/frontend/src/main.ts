import { library } from "@fortawesome/fontawesome-svg-core";
import { faDiscord, faSpotify } from "@fortawesome/free-brands-svg-icons";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { StatusRenderer } from "@presenti/renderer/src/main";
import Buefy from "buefy";
import "highlight.js/styles/default.css";
import Vue from "vue";
import * as Clipboard from "vue-clipboard2";
import VueHighlightJS from "vue-highlight.js";
import App from "./App.vue";
import Nav from "./components/partials/Nav.vue";
import OAuthIcon from "./components/partials/OAuthIcon.vue";
import Fade from "./components/transitions/Fade.vue";
import router from "./router";
import store from "./store";
import "./validation";

const json = require("highlight.js/lib/languages/json.js");

library.add(faSpotify, faDiscord, faCopy);

Vue.use(Buefy);
Vue.use(Clipboard as any);
Vue.use(VueHighlightJS, {
  languages: {
    json
  }
});
Vue.component("fade", Fade);
Vue.component("navigator", Nav);
Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.component("oauth-icon", OAuthIcon);
Vue.component("status-renderer", StatusRenderer);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
