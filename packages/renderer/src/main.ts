import Vue from 'vue';
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import StatusRenderer from './components/StatusRenderer.vue';
import TimeBar from './components/TimeBar.vue';
import PresentiPresence from './components/PresentiPresence.vue';

library.add(faPlay, faPause)
Vue.component('font-awesome-icon', FontAwesomeIcon)

const StatusRendererElements = {
    install(vue: typeof Vue): void {
      vue.component('StatusRenderer', StatusRenderer);
      vue.component('PresentiPresence', PresentiPresence);
    },
};

// @ts-ignore
Vue.use(StatusRendererElements, {});

if (typeof window === "object") {
  // @ts-ignore
  window.mountPresenti = function(scope: string, host: string, mount: string) {
    new StatusRenderer({
      propsData: {
        scope,
        host
      }
    }).$mount(mount);
  }
}

export { StatusRenderer, PresentiPresence, TimeBar };
export default StatusRendererElements;