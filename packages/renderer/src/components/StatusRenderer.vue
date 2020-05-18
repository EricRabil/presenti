<template>
  <div class="status-holder" v-if="presences.length > 0">
    <div class="presence-root" v-for="(presence, idx) of presences" :key="idx">
      <presenti-presence :presence="presence"></presenti-presence>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import { PresenceStream } from '@presenti/client'
import { PresenceStruct } from '@presenti/utils'
import PresentiPresence from './PresentiPresence.vue'

export interface Presence {
  name: string;
  type: string;
  url: string | null;
  details: string | null;
  state: string | null;
  applicationID: string | null;
  timestamps?: {
    start: string | null;
    end: string | null;
  };
  party: string | null;
  assets?: {
    largeText?: string;
    smallText?: string;
    largeImage?: string;
    smallImage?: string;
  };
  flags: number;
  emoji: string | null;
  createdTimestamp: number;
  data?: any;
}

export interface PresenceResponse {
  userID: string;
  guild: string;
  status: string;
  activities: Presence[];
  spotifyAssets: {
    [tag: string]: {
      url: string;
      palette: string[];
    };
  };
}

export type SpotifyAssets = PresenceResponse['spotifyAssets'];

interface PresenceState {
  gradient?: {
    color?: string;
    transition?: string;
  };
}

@Component({
  components: {
    PresentiPresence
  }
})
export default class PresenceRenderer extends Vue {
  presences: PresenceStruct[] = [];
  presenceState: PresenceState = {};
  stream: PresenceStream = null!;
  state: any = null;
  
  @Prop()
  url: string;

  @Prop()
  scope: string;

  created () {
    this.respawnSocket()
  }

  @Watch("presences")
  presencesChanged() {
    this.$emit("changed", this.presences.length);
  }

  @Watch("state")
  stateChanged() {
    this.$emit("changed", this.presences.length);
  }

  respawnSocket () {
    this.stream = new PresenceStream(this.scope, { url: this.url })
    this.stream.on('presence', (activities) => {
      window.parent.postMessage(JSON.stringify({presence: activities}), location.origin);
      Vue.set(this, "presences", activities)
    })
    this.stream.on('state', (state) => { Vue.set(this, "state", state) })
    this.stream.connect();
  }
}
</script>

<style lang="scss">
$min-row: 800px;

body {
  margin: 0;
  background: none transparent;
}

.status-holder {
  display: flex;
  flex-flow: row;
  width: fit-content;

  @media screen and (max-width: $min-row) {
    @media screen and (orientation: portrait) {
      flex-flow: column;
    }
  }
}

.presence-root {
  margin: 0 10px;

  &:first-child {
    margin-left: 0px;
  }

  &:last-child {
    margin-right: 0px;
  }

  @media screen and (max-width: $min-row) {
    @media screen and (orientation: portrait) {
      margin: 10px 0;
    }
  }
}
</style>
