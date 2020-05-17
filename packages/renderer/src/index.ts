import Vue from 'vue';
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import StatusRenderer from './components/StatusRenderer.vue';

library.add(faPlay, faPause)
Vue.component('font-awesome-icon', FontAwesomeIcon)

const StatusRendererElements = {
    install(vue: typeof Vue): void {
      vue.component('StatusRenderer', StatusRenderer);
    },
};

if (typeof window !== 'undefined' && window.Vue) {
    // @ts-ignore
    window.Vue.use(StatusRendererElements, {});

    // @ts-ignore
    window.mountPresenti = function(scope: string, url: string, mount: string) {
      new StatusRenderer({
        propsData: {
          scope,
          url
        }
      }).$mount(mount);
    }
}

export { StatusRenderer };
export default StatusRendererElements;