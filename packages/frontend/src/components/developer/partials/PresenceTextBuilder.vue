<template>
  <div class="columns">
    <b-field class="column is-4" :label="name">
      <b-input v-model="model.text" />
    </b-field>
    <b-field class="column is-4" :label="name + 'Link'">
      <b-input v-model="model.link" />
    </b-field>
    <b-field class="column is-4" :label="name + 'Type'">
      <b-select placeholder="Type" v-model="model.type">
        <option value="text">Text</option>
        <option value="md">Markdown</option>
      </b-select>
    </b-field>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { PresenceText } from "@presenti/utils";

@Component
export default class PresenceTextBuilder extends Vue {
  @Prop()
  value: PresenceText;

  @Prop()
  prefix: string;

  model = this.value;

  @Watch("model", { deep: true })
  modelChanged() {
    this.$emit("input", this.model);
  }

  get name() {
    return `${this.prefix ? `${this.prefix} ` : ''}Text `;
  }
}
</script>