<template>
  <div :class="['presence presenti-presence', {'presence-asset-only': assetOnly}]">
    <span class="presence-cta presence-cta-split">
      <presence-text v-model="title" />
      <font-awesome-icon v-if="typeof paused === 'boolean'" :icon="['fa', paused ? 'pause' : 'play']" />
    </span>
    <time-bar v-if="assetOnly" :stopped="paused === true" :start="start" :end="end"></time-bar>
    <div :class="['presence-detail', {'presence-single': assetOnly}]">
      <c-link v-if="image && image.src" class="asset-holder" :link="image.link">
        <img class="detail-asset" :src="image.src" alt="Image" />
      </c-link>
      <div class="detail-text">
        <presence-text class="detail-major" v-model="largeText" />
        <presence-text class="detail-minor" v-for="(_, index) of smallTexts" :key="index" v-model="smallTexts[index]" />
        <time-bar v-if="!(assetOnly || (start && end))" :stopped="paused === true" :start="start" :end="end" :effective="effective"></time-bar>
      </div>
    </div>
    <time-bar v-if="(start && end)" :stopped="paused === true" :start="start" :end="end"></time-bar>
  </div>
</template>

<script lang="ts">
import moment from 'moment'
import VueSlider from 'vue-slider-component'
import { Component, Prop, Vue } from 'vue-property-decorator'
import ConditionalLink from './ConditionalLink.vue'
import 'vue-slider-component/theme/default.css'
import TimeBar from './TimeBar.vue'
import { PresenceStruct, PresenceText } from '@presenti/utils'
import PresenceTextRenderer from "./PresenceTextRenderer.vue";

@Component({
  components: {
    CLink: ConditionalLink,
    PresenceText: PresenceTextRenderer,
    VueSlider,
    TimeBar
  }
})
export default class PresentiPresence extends Vue {
  @Prop()
  presence: PresenceStruct;

  get image () {
    if (!this.presence.image) return { src: null };
    if (typeof this.presence.image === 'string') {
      return {
        src: this.presence.image
      }
    }

    return this.presence.image
  }

  get largeText () {
    if (!this.presence.largeText) return { text: null };
    if (typeof this.presence.largeText === 'string') {
      return {
        text: this.presence.largeText
      }
    }

    return this.presence.largeText
  }

  get smallTexts () {
    if (!this.presence.smallTexts || !Array.isArray(this.presence.smallTexts)) return []

    return this.presence.smallTexts.map(text => {
      if (typeof text === 'string') {
        return {
          text
        }
      }

      return text
    })
  }

  get paused () {
    return this.presence.isPaused
  }

  get gradient () {
    if (!this.presence.gradient) return { enabled: false };
    if (typeof this.presence.gradient === 'boolean') {
      return {
        enabled: this.presence.gradient
      }
    }

    return this.presence.gradient
  }

  get title () {
    return this.presence.title;
  }

  get assetOnly () {
    return this.image?.src && !(this.largeText?.text) && this.smallTexts.filter(t => !!t && !!t.text).length === 0
  }

  get start () {
    return this.presence.timestamps?.start
  }

  get end () {
    return this.presence.timestamps?.stop
  }

  get effective() {
    return this.presence.timestamps?.effective
  }
}
</script>

<style lang="scss">
$presence-spacing: 15px;

.presence {
  display: flex;
  flex-flow: column;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 5px;
  padding: $presence-spacing;

  @media screen and (max-width: 350px) {
    font-size: 0.85rem;
  }

  a[href] {
    text-decoration: none;
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  .presence-cta {
    font-size: 0.7em;
    text-transform: uppercase;
    font-weight: bolder;
    padding-bottom: $presence-spacing;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 15px;
    column-gap: $presence-spacing;
  }

  &.presence-asset-only {
    min-width: 125px;

    .presence-cta {
      grid-template-columns: 1fr;
      text-align: center;
      padding-bottom: 0;
    }

    .time-bar {
      font-size: 0.75em;

      .timer-timestamp {
        margin: 0 auto;
      }
    }

    .presence-detail {
      padding-top: $presence-spacing;
    }
  }

  .presence-detail {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: $presence-spacing;

    &.presence-single {
      grid-template-columns: 1fr;
    }

    .detail-asset {
      height: 75px;
      border-radius: 5px;
    }

    .asset-holder {
      display: flex;
      justify-content: center;
    }

    .detail-text {
      display: flex;
      flex-flow: column;
      font-size: 0.9em;
      line-height: 1.2rem;

      .detail-major {
        font-weight: bold;
      }

      .detail-minor {
      }

      .detail-muted {
        // font-weight: bold;
        font-size: 0.8em;
        line-height: 1rem;
      }
    }
  }
}
</style>