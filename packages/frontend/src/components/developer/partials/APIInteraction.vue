<template>
  <div class="columns api-interaction">
    <div class="column is-6 api-input">
      <slot name="details" />
    </div>
    <div class="column is-6 api-output">
      <b-button class="api-output-clear" @click="clear">Clear</b-button>
      <highlight-code :class="[`direction-${entry.direction}`]" v-for="(entry, index) of value" lang="json" :key="index">
        {{entry.data}}
      </highlight-code>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

export interface InteractionLog {
  direction: "to" | "from";
  data: string;
}

@Component
export default class APIInteraction extends Vue {
  @Prop({ default: [] })
  public value: InteractionLog[];

  public clear() {
    this.$emit("input", []);
  }
}
</script>

<style lang="scss">
.api-interaction {
  .api-input {

  }

  .api-output {
    background-color: lighten(whitesmoke, 1);
    height: 600px;
    max-height: 600px;
    overflow-y: scroll;
    padding: 0;

    & > .api-output-clear {
      position: absolute;
      right: 0.75rem;
      margin: 0.5rem;
    }

    & > pre.direction-to, & > pre.direction-from {
      padding: 1rem 1.25rem;

      &:before {
        margin-top: -1rem;;
      }

      &.direction-to {
        background-color: darken(whitesmoke, 10);

        &:before {
          content: 'To Server';
        }
      }

      &.direction-from {
        &:before {
          content: 'From Server';
        }
      }

      &:not(:last-child) {
        border-bottom: 1px solid darken(whitesmoke, 20);
      }

      & > code {
        background-color: unset;
      }
    }
  }
}
</style>