import { library } from '@fortawesome/fontawesome-svg-core';
import { faPause } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { VueConstructor } from 'vue';

export default function installFontAwesome(vue: VueConstructor) {
    library.add(faPause);
    vue.component('font-awesome-icon', FontAwesomeIcon);
}