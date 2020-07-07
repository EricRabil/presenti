<template>
    <div class="dashboard">
        <div class="local-data">
            <digital-clock :blink="false" :twelveHour="true" />
            <live-date />
        </div>
        <media-presence v-if="mediaPresence" :presence="mediaPresence" />
        <div class="presence-tray">
            <presenti-presence v-for="(presence, index) of otherPresences" :key="index" :presence="presence" />
        </div>
    </div>
</template>

<script lang="ts">
import { PresenceStream } from "@presenti/client";
import { Component, Vue, Watch } from "vue-property-decorator";
import "vue-router";
import { PresenceList } from "@presenti/utils";
import MediaPresence from "../components/MediaPresence.vue";
import { PresentiPresence } from "@presenti/renderer/src/main";
import DigitalClock from "vue-digital-clock";
import LiveDate from "../components/LiveDate.vue";
import "vuex";

@Component({
    components: {
        MediaPresence,
        PresentiPresence,
        DigitalClock,
        LiveDate
    }
})
export default class Dashboard extends Vue {
    stream: PresenceStream | null = null;
    presences: PresenceList = [];
    state: {
        gradient?: {
            color: string;
            transition: number;
        };
    } = {};

    value: string;

    get scope() {
        return this.$route.params.scope;
    }

    get mediaPresences() {
        return this.presences.filter(presence => typeof presence.isPaused === "boolean");
    }

    get mediaPresence() {
        return this.mediaPresences.filter(presence => presence.image && (typeof presence.image === "string" || typeof presence.image.src === "string"))[0];
    }

    get otherPresences() {
        return this.presences.filter(presence => presence !== this.mediaPresence);
    }

    get image() {
        const image = this.mediaPresence?.image;
        if (!image) return null;
        if (typeof image === "string") return image;
        return image.src;
    }

    get gradient() {
        if (!this.state) return null;
        const { gradient } = this.state;
        if (!gradient) return null;
        return gradient.color;
    }

    @Watch("image", { immediate: true })
    imageChanged() {
        const { image: background, gradient } = this;
        this.$emit("input", { background, gradient });
    }

    mounted() {
        this.stream = new PresenceStream(this.scope, {
            host: process.env.VUE_APP_STREAM_HOST || "api.presenti.me"
        });

        this.stream.connect();

        this.stream.on("presence", presences => {
            this.presences = presences;
        });

        this.stream.on("state", state => {
            this.state = state;
        });
    }
}
</script>

<style lang="scss">
#app > .dashboard {
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
    --primary-background: rgba(0,0,0,0.2);
    --border: 5px;

    @media screen and (max-height: 600px) and (min-width: 700px) {
        flex-flow: row;
    }

    & .local-data {
        @media screen and (max-height: 600px) and (max-width: 699px) {
            visibility: hidden !important;
            display: none !important;
        }

        position: absolute;
        bottom: 0;
        left: 0;

        border-radius: var(--border);
        padding: 10px;
        margin: 10px;

        &:hover {
            background: var(--primary-background);
            cursor: pointer;
        }
        
        & .clock {
            font-size: 2em;
            line-height: 1.1;
        }
    }

    & h1, h2, h3, h4, h5, h6, p, span {
        opacity: 0.7;
    }

    & > .presence-tray {
        display: flex;
        flex-flow: row;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        padding: 10px;

        @media screen and (max-height: 600px) {
            flex-flow: column;
        }

        --a: #68737e;

        & > .presence {
            border: 0;
            background-color: var(--primary-background);
            margin: 10px 10px 10px 10px;
        }
    }
}
</style>