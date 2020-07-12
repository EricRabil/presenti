<template>
    <component :is="tag">
        <b-field label="Attributes">
            <div class="field attributes-field is-grouped">
                <div class="field has-addons">
                    <b-checkbox-button v-model="attributes.admin" :native-value="true" type="is-primary">
                        <b-icon icon="user-shield" size="is-small"></b-icon>
                        <span>Admin</span>
                    </b-checkbox-button>
                    <b-checkbox-button v-model="attributes.limited" :native-value="true" type="is-warning">
                        <b-icon icon="hand-paper" size="is-small"></b-icon>
                        <span>Limited</span>
                    </b-checkbox-button>
                    <b-checkbox-button v-model="attributes.banned" :native-value="true" type="is-danger">
                        <b-icon icon="hand-middle-finger" size="is-small"></b-icon>
                        <span>Banned</span>
                    </b-checkbox-button>
                </div>

                <b-button v-if="inlineAttributeSave" @click="bulkSaveAttributes" type="is-primary">
                    <span>Save Changes</span>
                </b-button>
            </div>
        </b-field>

        <b-field label="Ban Reason" v-if="attributes.banned">
            <b-input v-model="attributes.banReason" />
        </b-field>

        <b-field label="Actions">
            <div class="buttons">
                <b-button type="is-info" @click="keyGenRequested = true" v-if="singular">
                    Generate API Key
                </b-button>
                <b-button type="is-warning">
                    Reset Password{{ !singular ? 's' : '' }}
                </b-button>
                <b-button type="is-danger">
                    Delete Account{{ !singular ? 's' : '' }}
                </b-button>
            </div>
        </b-field>

        <APIKeyGeneratorDialog :active.sync="showGeneratorDialog" :existing-key="generatedKey" />
    </component>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { AdminUserSDK } from "../../../sdk/admin";
import { PresentiUser } from "@presenti/utils";
import APIKeyGeneratorDialog from "../../dialogs/APIKeyGeneratorDialog.vue";

@Component({
    components: {
        APIKeyGeneratorDialog
    }
})
export default class UserActions extends Vue {
    @Prop({ default: () => ({
        attributes: {
            admin: false,
            limited: false,
            banned: false
        }
    })})
    value: Partial<PresentiUser>;

    @Prop()
    users: Array<AdminUserSDK.PresentiSearchUser & Partial<PresentiUser>> | undefined;

    @Prop({ default: "div" })
    tag: string;

    keyGenRequested = false;
    generatedKey: string | null = null;

    @Watch("keyGenRequested")
    async keyGenRequestDidChange(requested: boolean) {
        if (!requested) return;
        this.generatedKey = await AdminUserSDK.apiKey(this.value.uuid).then(({ key }) => key);
    }

    get showGeneratorDialog() {
        return this.generatedKey && this.keyGenRequested;
    }

    set showGeneratorDialog(showing) {
        if (!showing) {
            this.keyGenRequested = false;
            this.generatedKey = null;
        }
    }

    async bulkSaveAttributes() {
        const { uuids, value: { attributes } } = this;

        await AdminUserSDK.bulkPatchAttributes({
            uuids,
            attributes
        });

        this.users.forEach(user => user.attributes = attributes);

        const plural = this.users.length !== 1;

        this.$buefy.toast.open({ message: `Overwrote attributes for ${this.users.length} user${plural ? 's' : ''}`, type: 'is-success', duration: 2500 })
    }

    get attributes(): PresentiUser["attributes"] {
        return this.value?.attributes || {
            admin: false,
            limited: false,
            banned: false
        }
    }

    get uuids(): string[] | null {
        if (!this.users) return null;
        return this.users.map(({ uuid }) => uuid);
    }

    get uuid(): string | null {
        if (this.uuids) return null;
        return this.value.uuid || null;
    }

    get singular() {
        return !this.uuids;
    }

    get inlineAttributeSave() {
        return !this.singular;
    }
}
</script>

<style lang="scss">
.attributes-field > .field {
    margin-bottom: 0;
}
</style>