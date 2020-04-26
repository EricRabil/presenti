<template>
  <span>
    <a v-if="link" :href="link" target="_blank">
      <slot></slot>
    </a>
    <slot v-else></slot>
  </span>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class ConditionalLink extends Vue {
  @Prop()
  link: string;
}
</script>
