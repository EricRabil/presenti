import Vue from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import App from './components/StatusRenderer.vue'

library.add(faPlay, faPause)
Vue.component('font-awesome-icon', FontAwesomeIcon)

Vue.config.productionTip = false;

(window as any).mountPresenti = function(scope: string, url: string, mount: string) {
  new App({
    propsData: {
      scope,
      url
    }
  }).$mount(mount);
}