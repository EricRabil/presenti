<template>
  <ValidationProvider
    :vid="vid"
    :name="$attrs.name || $attrs.label"
    :rules="rules"
    v-slot="{ errors, valid }"
  >
    <b-field
      v-bind="$attrs"
      :type="{ 'is-danger': error || errors[0], 'is-success': valid }"
      :message="error || errors"
    >
      <b-input v-on="$listeners" v-model="innerValue" v-bind="$attrs"></b-input>
    </b-field>
  </ValidationProvider>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { ValidationProvider } from "vee-validate";

@Component({
  components: {
    ValidationProvider
  }
})
export default class BInputWithValidation extends Vue {
  @Prop()
  public vid: string;

  @Prop({ default: "" })
  public rules: object | string;

  @Prop({ default: null })
  public value: any;

  @Prop({ default: null })
  public error: string | null;

  public innerValue: any = "";

  public created() {
    if (this.value) {
      this.innerValue = this.value;
    }
  }

  public mounted() {
    this.$watch("innerValue", (val) => this.$emit("input", val));
    this.$watch("value", (val) => this.innerValue = val);
  }
}
</script>
