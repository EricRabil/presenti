<template>
    <div class="marquee-host" ref="host">
        <div :class="['marquee-view', { running: showMarquee }]" ref="view">
            <slot></slot>
            <slot v-if="showMarquee"></slot>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ResizeObserver from "resize-observer-polyfill";

@Component
export default class MarqueeText extends Vue {
    observer = new ResizeObserver(entries => entries.forEach(entry => this.observeChanges(entry)));
    showMarquee = false;

    $refs: {
        host: HTMLDivElement;
        view: HTMLDivElement;
    }

    mounted() {
        this.observer.observe(this.$refs.view);
    }

    observeChanges({ target: { children } }: ResizeObserverEntry) {
        this.showMarquee = children[0].clientWidth > this.parentWidth();
    }

    parentWidth() {
        return this.$el.clientWidth;
    }
}
</script>

<style lang="scss">
.marquee-host {
    overflow: hidden;
    width: 100%;
    text-align: center;
    
    @keyframes marquee {
        0%, 10%  { transform: translateX(0); }
        90%, 100% { transform: translateX(-50%); }
    }

    & > .marquee-view {
        white-space: nowrap;
        display: inline-block;
        margin: 0;

        &.running {
            animation: marquee 10s ease-in-out infinite;

            & > * {
                margin-right: 20px;
            }
        }

        & > * {
            display: inline-block;
        }
    }
}
</style>