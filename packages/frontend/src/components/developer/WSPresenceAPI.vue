<template>
  <div class="api-interactive">
    <div class="api-controls">
      <h5 class="title is-5">WebSocket Presence API</h5>
      <h5 class="subtitle is-5">This API allows you to stream your presence data from Presenti</h5>
      <div class="buttons">
        <b-button :type="connected ? 'is-danger' : 'is-success'" @click="connectButtonClicked">{{connected ? "Disconnect" : "Connect"}}</b-button>
      </div>
    </div>
    <hr>
    <APIInteraction v-model="log">
      <div slot="details">
        <h6 class="title is-6">Ping Payload</h6>
        <h6 class="subtitle is-6">The ping payload is the only payload you will send on this API</h6>
        <b-button type="is-link" :disabled="!connected" @click="ping">Send Ping Payload</b-button>
      </div>
    </APIInteraction>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import RemoteClient, { PresenceStream } from "@presenti/client";
import APIInteraction from "./partials/APIInteraction.vue";

@Component({
  components: {
    APIInteraction
  }
})
export default class WSPresenceAPI extends Vue {
  @Prop()
  public stream: PresenceStream;

  public connected: boolean = false;
  public log: Array<{ data: string, direction: "to" | "from"}> = [];

  public mounted() {

  }

  public destroyed() {
    this.stream?.close();
  }

  @Watch("stream", { immediate: true })
  public clientChanged(newValue: PresenceStream | null) {
    if (!newValue) { return; }
    newValue.trace = (direction, data) => this.trace(data, direction);
    newValue.on("close", () => this.connected = false);
    newValue.on("open", () => this.connected = true);
  }

  public trace(data: string, direction: "to" | "from") {
    this.log.push({ data, direction });
  }

  public ping() {
    this.stream.ping();
  }

  public connectButtonClicked() {
    if (this.connected) {
      this.stream.close();
    } else {
      this.log = [];
      this.stream.connect();
    }
  }
}
</script>

<style lang="scss">
.api-interactive {
  .api-controls {

  }
}
</style>