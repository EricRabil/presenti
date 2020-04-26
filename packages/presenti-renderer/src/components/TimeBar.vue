<template>
  <div class="time-bar" v-if="start">
    <span class="timer-timestamp">{{currentTime}}</span>
    <vue-slider v-if="end" :disabled="true" :value="progress"></vue-slider>
    <span v-if="end" class="timer-timestamp">{{endTime}}</span>
  </div>
</template>

<script lang="ts">
import moment from 'moment'
import VueSlider from 'vue-slider-component'
import { Component, Prop, Vue } from 'vue-property-decorator'
import 'vue-slider-component/theme/default.css'
const durationFormat = require('moment-duration-format')
durationFormat(moment)

@Component({
  components: {
    VueSlider
  }
})
export default class TimeBar extends Vue {
  @Prop()
  start: number;

  @Prop()
  end: number;

  @Prop()
  stopped: boolean;

  progress = 0;
  currentTime = '00:00';
  endTime = '00:00';
  interval: ReturnType<typeof setInterval>;

  mounted () {
    this.interval = setInterval(() => {
      if (this.stopped === true) return
      this.updateTime()
    }, 1000)
    this.updateTime()
  }

  beforeDestroy () {
    clearInterval(this.interval)
  }

  get startDate () {
    return this.start ? new Date(this.start) : null
  }

  get endDate () {
    return this.end ? new Date(this.end) : null
  }

  elapsed () {
    if (!this.startDate) return
    const elapsed = moment.duration(moment().diff(this.startDate)).humanize()
    return `for ${elapsed}`
  }

  updateTime () {
    if (!this.startDate) return
    this.currentTime = moment(moment().diff(moment(this.startDate))).format(
      'mm:ss'
    )
    if (!this.endDate) {
      this.currentTime = this.elapsed()!
      return
    }
    let newProgress =
      100 *
      ((Date.now() - this.startDate.getTime()) /
        (this.endDate.getTime() - this.startDate.getTime()))
    if (newProgress >= 100) newProgress = 100
    this.progress = newProgress
    this.endTime = moment(
      this.endDate.getTime() - this.startDate.getTime()
    ).format('mm:ss')
    if (this.progress >= 100) {
      this.currentTime = this.endTime
    }
  }
}
</script>

<style lang="scss">
.time-bar {
  padding-top: 5px;
  display: inline-flex;
  flex-flow: row;
  align-items: center;

  .timer-timestamp {
    &:not(:only-child) {
      font-size: 0.8em;

      &:first-child {
        margin-right: 10px;
      }

      &:last-child {
        margin-left: 10px;
      }
    }
  }

  .vue-slider {
    flex-grow: 1;
  }

  .vue-slider {
    width: 95% !important;
    margin: 0 auto;

    .vue-slider-rail {
      border-radius: 15px;
      overflow: hidden;

      .vue-slider-process {
        border-radius: 0 !important;
      }
    }

    .vue-slider-dot {
      display: none;
      width: 10px !important;
      height: 10px !important;

      .vue-slider-dot-handle.vue-slider-dot-handle-disabled {
        cursor: initial;
      }

      .vue-slider-dot-tooltip {
        display: none;
      }
    }

    &.vue-slider-disabled {
      opacity: 1;
      cursor: initial;
    }
  }
}
</style>
