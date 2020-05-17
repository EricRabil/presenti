<template>
  <font-awesome-icon :icon="['fab', definition.asset]" :style="{color: colors[definition.key]}" size="lg" />
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { OAuthModuleDefinition, OAUTH_PLATFORM } from "@presenti/utils";

@Component
export default class OAuthIcon extends Vue {
  @Prop()
  public definition: OAuthModuleDefinition;

  get color() {
    return this.colors[this.definition.key];
  }

  private colors: Record<OAUTH_PLATFORM, string> = {
    [OAUTH_PLATFORM.SPOTIFY]: "#7ab800",
    [OAUTH_PLATFORM.SPOTIFY_INTERNAL]: "#7ab800",
    [OAUTH_PLATFORM.DISCORD]: "#7289da"
  } as any;
}
</script>