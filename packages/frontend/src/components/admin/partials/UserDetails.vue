<template>
    <transition name="fade" v-if="!loading">
        <div class="user-details">
            <div class="columns">
                <div class="column">
                    <b-field label="Email">
                        <b-input v-model="changes.email" />
                    </b-field>

                    <b-field label="User ID">
                        <b-input v-model="changes.userID" />
                    </b-field>

                    <b-field label="Display Name">
                        <b-input v-model="changes.displayName" />
                    </b-field>
                </div>
                <user-actions class="column" v-model="changes" />
            </div>

            <div class="level footer-level">
                <div class="level-left">
                </div>
                <div class="level-right">
                    <b-button type="is-primary" :disabled="!hasChanges" @click="save">Save Changes</b-button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { PresentiUser } from "@presenti/utils";
import { AdminUserSDK } from "../../../sdk/admin";
import UserActions from "./UserActions.vue";

@Component({
    components: {
        UserActions
    }
})
export default class UserDetails extends Vue {
    @Prop()
    value: PresentiUser & { raw?: boolean };

    changes: PresentiUser = {} as any;
    loading = this.value.raw;
    version: number = 0;

    async mounted() {
        if (this.loading) {
            this.changed(await AdminUserSDK.getUser(this.value.uuid));
            this.loading = false;
        }

        this.changes = JSON.parse(JSON.stringify(this.value));
    }

    async save() {
        if (!this.hasChanges) return;

        this.changed(await AdminUserSDK.editUser(this.value.uuid, this.diffObject));
    }

    private changed(value: PresentiUser) {
        this.$emit('input', Object.assign(this.value, value, { raw: false }));
        this.changes = JSON.parse(JSON.stringify(this.value));
        this.version++;
    }

    get changedProperties(): string[] {
        this.version;
        
        function compare(obj1: object, obj2: object) {
            if (typeof obj1 === "undefined" || obj1 === null || typeof obj2 === "undefined" || obj2 === null) return [];
            return Object.keys(obj1).filter(key => {
                if (typeof obj1[key] !== "object" || obj1[key] === null) {
                    if (obj1[key] === null && obj2[key] === "") return false;
                    return obj1[key] !== obj2[key];
                }
                if (typeof obj2[key] !== "object") return false;
                return compare(obj1[key], obj2[key]).length > 0;
            });
        }

        return compare(this.value, this.changes);
    }

    get diffObject() {
        return this.changedProperties.reduce((acc, key) => Object.assign(acc, { [key]: this.changes[key] }), {});
    }

    get hasChanges() {
        return this.changedProperties.length > 0;
    }
}
</script>

<style lang="scss">
.user-details {
    .level.footer-level {
        padding-bottom: 0 !important;
    }
}
</style>