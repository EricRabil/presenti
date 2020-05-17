<template>
  <transition
    name="fade"
    mode="out-in"
    @beforeLeave="beforeLeave"
    @enter="enter"
    @afterEnter="afterEnter"
  >
    <slot />
  </transition>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class Fade extends Vue {
  public prevHeight: string | number = 0;

  public beforeLeave(element: HTMLElement) {
    this.prevHeight = getComputedStyle(element).height;
  }

  public enter(element: HTMLElement) {
    const { height } = getComputedStyle(element);

    element.style.height = this.prevHeight.toString();

    setTimeout(() => {
      element.style.height = height;
    });
  }

  public afterEnter(element: HTMLElement) {
    element.style.height = "auto";
  }
}
</script>

<style lang="scss">
 .fade-enter-active,
 .fade-leave-active {
   transition-duration: 0.3s;
   transition-property: height, opacity;
   transition-timing-function: ease;
   overflow: hidden;
}

.fade-enter,
.fade-leave-active {
  opacity: 0
}
</style>