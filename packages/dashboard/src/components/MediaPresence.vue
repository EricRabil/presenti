<template>
    <div class="media-presence">
        <div class="media-image-host">
            <transition name="fade">
                <img class="media-image" v-if="image" :src="image" :key="image" />
            </transition>
            <transition name="scale-up">
                <div class="pause-overlay" v-if="paused">
                    <PauseSVG />
                </div>
            </transition>
        </div>
        <m-text class="media-large-text">
            <p-text v-model="largeText" tag="h6" />
        </m-text>
        <m-text v-for="(text, index) of smallTexts" :key="index" class="media-small-text">
            <p-text v-model="smallTexts[index]" tag="p" />
        </m-text>
        <time-bar v-if="start && end" class="time-bar" :stopped="paused === true" :start="start" :end="end" :effective="effective"></time-bar>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { PresenceStruct } from "@presenti/utils";
import PresenceTextRenderer from "./TextRenderer.vue";
import MarqueeText from "./MarqueeText.vue";
import 'vue-slider-component/theme/default.css'
import { TimeBar } from "@presenti/renderer/src/main";
import PauseSVG from "../resources/pause.svg";

@Component({
    components: {
        PText: PresenceTextRenderer,
        MText: MarqueeText,
        TimeBar,
        PauseSVG
    }
})
export default class MediaPresence extends Vue {
    @Prop()
    presence: PresenceStruct;

    get image() {
        const { image } = this.presence;
        if (typeof image === "string") return image;
        else if (typeof image === "object" && image) return image.src;
        return null;
    }

    get largeText() {
        return this.presence.largeText;
    }

    get smallTexts() {
        return this.presence.smallTexts;
    }

    get paused() {
        return !!this.presence.isPaused;
    }

    get start() {
        return this.presence.timestamps?.start;
    }

    get end() {
        return this.presence.timestamps?.stop;
    }

    get effective() {
        return this.presence.timestamps?.effective;
    }
}
</script>

<style lang="scss">
.scale-up-enter-active {
  animation: scaleUp .2s;
}
.scale-up-leave-active {
  animation: scaleUp .2s reverse;
}
@keyframes scaleUp {
  0% {
    font-size: 4em;
    opacity: 0;
  }
  100% {
    font-size: 3em;
    opacity: inherit;
  }

}

.media-presence {
    --border-radius: 5px;
    --spacing: 10px;
    --image: 256px;
    --border: 1px;
    
    max-width: calc((var(--border) * 2) + (var(--spacing) * 2) + var(--image));

    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;

    padding: var(--spacing);
    border-radius: var(--border-radius);
    border: 0;

    & > .time-bar {
        width: 100%;

        & .vue-slider-rail {
            background-color: rgba(#ccc, 0.25);

            & .vue-slider-process {
                background-color: rgba(#ccc, 0.8);
            }
        }
    }

    & > .media-image-host {
        height: var(--image);
        width: var(--image);
        
        & > .media-image {
            max-height: var(--image);
            max-width: var(--image);
            border-radius: var(--border-radius);
            position: fixed;
        }

        & > .pause-overlay {
            position: absolute;
            border-radius: var(--border-radius);
            height: var(--image);
            width: var(--image);

            display: flex;
            justify-content: center;
            align-items: center;

            background-color: rgba(0,0,0,0.6);
            fill: currentColor;
            font-size: 3em;
        }
    }

    & > .media-large-text {
        padding-top: var(--spacing);
    }

    & > .media-small-text {
        font-size: 0.8em;
        color: var(--light);
        white-space: nowrap;
        max-width: var(--image);
    }

    & h1, h2, h3, h4, h5, h6, p, span {
        margin: 0;
    }

    & h1, h2, h3, h4, h5, h6 {
        font-size: 1.0em;
    }
}
</style>