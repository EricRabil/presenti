<template>
  <div :class="['presence presenti-presence', {'presence-asset-only': assetOnly}]">
    <span class="presence-cta presence-cta-split">
      {{title}}
      <font-awesome-icon v-if="typeof paused === 'boolean'" :icon="['fa', paused ? 'pause' : 'play']" />
    </span>
    <time-bar v-if="assetOnly" :stopped="paused === true" :start="start" :end="end"></time-bar>
    <div :class="['presence-detail', {'presence-single': assetOnly}]">
      <c-link v-if="image" class="asset-holder" :link="image.link">
        <img class="detail-asset" :src="image.src" alt="Image" />
      </c-link>
      <div class="detail-text">
        <c-link class="detail-major" :link="largeText.link">
          {{largeText.text}}
        </c-link>
        <c-link v-for="({ text, link }, index) of smallTexts" :key="index" class="detail-minor" :link="link">
          {{text}}
        </c-link>
        <time-bar v-if="!(assetOnly || (start && end))" :stopped="paused === true" :start="start" :end="end"></time-bar>
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
import { PresenceStruct } from '@presenti/utils'

@Component({
  components: {
    CLink: ConditionalLink,
    VueSlider,
    TimeBar
  }
})
export default class PresentiPresence extends Vue {
  @Prop()
  presence: PresenceStruct;

  get image () {
    if (typeof this.presence.image === 'string') {
      return {
        src: this.presence.image
      }
    }

    return this.presence.image
  }

  get largeText () {
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
    if (typeof this.presence.gradient === 'boolean') {
      return {
        enabled: this.presence.gradient
      }
    };

    return this.presence.gradient
  }

  get title () {
    return this.presence.title
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
}
</script>
