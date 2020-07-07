<template>
  <component :is="tag">
    <a v-if="link" :href="link" target="_blank">
      <slot></slot>
    </a>
    <slot v-else></slot>
  </component>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class ConditionalLink extends Vue {
  @Prop()
  link: string;

  @Prop({ default: "span"})
  tag: string;
}
</script>
