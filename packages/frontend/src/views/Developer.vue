<template>
  <div class="developers section">
    <PresencePreview />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { RemoteClient } from "@presenti/client"
import apiClient, { apiEndpoint } from "../api";
import PresencePreview from "../components/developer/PresenceBuilder.vue";

@Component({
  components: {
    PresencePreview
  }
})
export default class Developer extends Vue {
  client: RemoteClient = null;

  async mounted() {
    const key = await apiClient.createAPIKey();
    this.client = new RemoteClient({ token: key, host: apiEndpoint });
  }

  get ready() {
    return this.client !== null;
  }
}
</script>