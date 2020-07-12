<template>
    <p-dialog :active="active">
        <APIKeyGenerator :existing-key="existingKey" />
    </p-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import APIKeyGenerator from "../partials/APIKeyGenerator.vue";

@Component({
    components: {
        APIKeyGenerator
    }
})
export default class APIKeyGeneratorDialog extends Vue {
    @Prop()
    active: boolean;

    @Prop()
    existingKey: string;
}
</script>