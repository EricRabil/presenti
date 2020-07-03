<template>
  <div class="developers section">
    <component v-if="activeModule" :is="activeModule" :client="client" :stream="stream" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { RemoteClient, PresenceStream } from "@presenti/client";
import apiClient, { apiEndpoint, apiHost } from "../api";
import PresencePreview from "../components/developer/PresenceBuilder.vue";
import WSPresenceAPI from "../components/developer/WSPresenceAPI.vue";
import user from "../store/modules/user";
import "vue-router";
import { PresenceBuilder, WebLogger } from "@presenti/utils";
import { VueConstructor } from "vue";
import RESTPresenceAPI from "../components/developer/RESTPresenceAPI.vue";
import WSRemoteAPI from "../components/developer/WSRemoteAPI.vue";

const log = new WebLogger("Developer.vue", console);

@Component({
  components: {
    PresencePreview
  }
})
export default class Developer extends Vue {

  get userID(): string | undefined {
    return this.$store.getters["user/model"]?.userID;
  }

  get ready() {
    return this.client !== null;
  }

  get activeModule(): VueConstructor | null {
    return Developer.modules[this.$route.path] || null;
  }

  public static modules: Record<string, VueConstructor> = {
    "/developer/presence/ws": WSPresenceAPI,
    "/developer/presence/rest": RESTPresenceAPI,
    "/developer/remote/ws": WSRemoteAPI,
    "/developer/builder": PresencePreview
  };
  public client: RemoteClient = null!;
  public stream: PresenceStream = null!;
  public activeTab: number = 0;

  public async mounted() {
    const key = await apiClient.createAPIKey();
    this.client = new RemoteClient({ token: key, host: apiHost });
  }

  @Watch("userID", { immediate: true })
  public userIDChanged(userID: string) {
    if (!userID) { return; }
    this.stream = new PresenceStream(userID, { host: apiHost });
  }
}
</script>

<style lang="scss">
.developers > .developers-tabs {
  margin-top: -3rem;
}
</style>