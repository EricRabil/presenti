<template>
  <div class="api-interactive">
    <div class="api-controls">
      <h5 class="title is-5">REST Presence API</h5>
      <h5 class="subtitle">This API allows you to scrape presence data from Presenti</h5>
    </div>
    <hr>
    <APIInteraction v-model="log">
      <div slot="details">
        <h6 class="title is-6">Scrape Presence Data</h6>
        <h6 class="subtitle is-6">The only endpoint needed to scrape presence data is <code>GET /api/presence/:scope</code></h6>
        <hr>
        <p>Wanna give it a try? Enter a scope and test it out.</p>
        <b-field label="Scope">
          <b-input v-model="scope" />
        </b-field>
        <pre class="request-preview">GET {{url}}</pre>
        <b-button type="is-link" @click="scrape">
          Scrape
        </b-button>
      </div>
    </APIInteraction>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import APIInteraction, { InteractionLog } from "./partials/APIInteraction.vue";
import RemoteClient from "@presenti/client";

@Component({
  components: {
    APIInteraction
  }
})
export default class RESTPresenceAPI extends Vue {
  @Prop()
  public client: RemoteClient;

  public log: InteractionLog[] = [];
  public scope: string = this.$store.getters["user/model"]?.userID || "";

  public async scrape() {
    this.log.push({ direction: "from", data: JSON.stringify(await this.client.scrape(this.scope), undefined, 4)});
  }

  get url() {
    const urlString = this.client?.ajax.baseURL;
    if (!urlString) { return; }
    const url = new URL(urlString);
    url.pathname = `/api/presence/${this.scope || ":scope"}`;
    return url.toString();
  }
}
</script>

<style lang="scss">
.api-interactive {
  & pre.request-preview {
    margin-bottom: 0.75rem;
  }
}
</style>