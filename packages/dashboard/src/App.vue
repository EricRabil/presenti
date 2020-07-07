<template>
  <div id="app" :class="{nobg: !!background}">
    <div class="app-bg" v-if="background" v-blur="blurConfig">
      <transition name="fade">
        <img :src="background" :key="background" />
      </transition>
      <transition name="fade">
        <div class="gradient-band" v-if="gradient" :key="gradient" :style="{'--color': gradient}" />
      </transition>
    </div>
    <router-view class="view" v-model="backdrop" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import vBlur from "v-blur";

Vue.use(vBlur);

@Component
export default class App extends Vue {
  backdrop: {
    background: string;
    gradient: string | null;
  } | null = null;

  blurConfig = {
    isBlurred: true,
    filter: 'brightness(50%)',
    transition: 'filter .3s linear'
  };

  get background() {
    return this.backdrop?.background || null;
  }

  get gradient() {
    return this.backdrop?.gradient || null;
  }
}
</script>

<style lang="scss">
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}

#app {
  height: 100vh;
  width: 100vw;

  & > .view {
    height: 100vh;
    width: 100vw;
    max-height: 100vh;
    max-width: 100vw;
    min-height: 100vh;
    min-width: 100vw;
    overflow: hidden;
    backdrop-filter: blur(10px);
  }

  & > .app-bg {
    height: 100vh;
    width: 100vw;
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

    & > .gradient-band {
      position: absolute;
      height: 100%;
      width: 100%;
      background-image: linear-gradient(135deg, var(--color), transparent);
    }

    & > img {
      position: absolute;
      flex-shrink: 0;
      min-width: 120%;
      min-height: 120%;
    }
  }

  & {
    color: #eee;
    background-color: #111 !important;
  }
}
</style>
