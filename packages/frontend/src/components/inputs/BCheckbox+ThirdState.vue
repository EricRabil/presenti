<template>
  <b-checkbox :indeterminate="state === 1" :value="state === 1 ? null : state === 2" @input="nextState" />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class BCheckboxThirdState extends Vue {
  @Prop({ default: null })
  public value: boolean | null;

  public state = this.value === null ? 1 : this.value === true ? 2 : 0;

  public nextState() {
    if ((this.state + 1) === 3) {
      this.state = 0;
    } else { this.state++; }

    this.$emit("input", this.newValue);
  }

  get newValue() {
    return this.state === 1 ? null : this.state === 2;
  }
}
</script>