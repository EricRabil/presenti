<template>
    <b-message v-if="message" title="Oh fuck!" type="is-danger" has-icon icon-size="is-small" aria-close-label="Dismiss error">
        {{message}}
    </b-message>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { APIError } from "@presenti/utils";

@Component
export default class ErrorRenderer extends Vue {
    @Prop()
    value: APIError | null;

    get message() {
        return this.value?.message;
    }
}
</script>