<template>
  <div class="link-button button is-light" @click="clicked">
    <oauth-icon :definition="definition" />
    <div class="link-detail-title">{{definition.name}}</div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { OAuthModuleDefinition, PresentiUser } from "@presenti/utils";
import apiClient from "../../api";

@Component
export default class LinkButton extends Vue {
  @Prop()
  public definition: OAuthModuleDefinition;

  @Prop()
  public model: PresentiUser;

  get linked() {
    if (!this.model.platforms) { return false; }
    return this.definition.key in this.model.platforms;
  }

  get url() {
    return this.linked ? this.definition.unlink : this.definition.link;
  }

  public async clicked() {
    const result = await apiClient.fetchJSON(this.url, "get", {
      redirect: "manual",
      credentials: "include"
    });

    if ("url" in result && typeof result.url === "string") {
      location.href = result.url;
    }
  }
}
</script>

<style lang="scss">
.link-button {
  .link-detail-title {
    margin-left: 5px;
  }
}
</style>