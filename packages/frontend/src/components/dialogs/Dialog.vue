<template>
    <b-modal :active.sync="isActive"
        has-modal-card
        trap-focus
        :destroy-on-hide="true"
        aria-role="dialog"
        aria-modal>
        <slot />
    </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class Dialog extends Vue {
    @Prop()
    active: boolean;

    get isActive() {
        return this.active;
    }

    set isActive(newValue) {
        this.$emit('update:active', newValue);
        this.$parent.$emit('update:active', newValue);
    }
}
</script>