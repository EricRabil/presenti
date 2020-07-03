<template>
  <div class="api-interactive">
    <div class="api-controls">
      <h5 class="title is-5">WebSocket Remote API</h5>
      <h5 class="subtitle is-5">This API allows you to post presence data to Presenti over a WebSocket connection</h5>
      <div class="buttons">
        <b-button :type="connected ? 'is-danger' : 'is-success'" @click="connectButtonClicked">{{connected ? "Disconnect" : "Connect"}}</b-button>
      </div>
    </div>
    <hr>
    <APIInteraction v-model="log">
      <div slot="details">
        <h6 class="title is-6">Ping Payload</h6>
        <h6 class="subtitle is-6">The ping payload is the heartbeat of this API, and should be sent every thirty seconds.</h6>
        <b-button type="is-link" :disabled="!connected" @click="ping">Send Ping Payload</b-button>

        <hr>

        <h6 class="title is-6">Presence Payload</h6>
        <h6 class="subtitle is-6">The presence payload provides the presence data for your account</h6>
        <b-button type="is-link" :disabled="!connected" @click="sendPresence">Send Presence Payload</b-button>
        <PresenceBuilder layout="column" @input="e => presence = e" />
      </div>
    </APIInteraction>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import RemoteClient from "@presenti/client";
import APIInteraction from "./partials/APIInteraction.vue";
import PresenceBuilder from "./PresenceBuilder.vue";
import { PresenceStruct } from "@presenti/utils";

@Component({
    components: {
        APIInteraction,
        PresenceBuilder
    }
})
export default class WSRemoteAPI extends Vue {
    @Prop()
    public client: RemoteClient;

    public connected: boolean = false;
    public log: Array<{ data: string, direction: "to" | "from" }> = [];
    public presence: PresenceStruct | null = null;

    public mounted() {

    }

    @Watch("client", { immediate: true })
    public clientChanged(client: RemoteClient | null) {
        if (!client) return;
        client.socket.trace = (direction, data) => this.trace(data, direction);
        client.socket.on("open", () => this.connected = true);
        client.socket.on("close", () => this.connected = false);
    }

    public destroyed() {
        this.client.close();
    }

    public trace(data: string, direction: "to" | "from") {
        this.log.push({ data, direction });
    }

    public ping() {
        this.client.ping();
    }

    public sendPresence() {
        this.client.presence(this.presence ? [this.presence] : undefined);
    }

    public connectButtonClicked() {
        if (this.connected) {
            this.client.close();
        } else {
            this.log = [];
            this.client.run();
        }
    }
}
</script>