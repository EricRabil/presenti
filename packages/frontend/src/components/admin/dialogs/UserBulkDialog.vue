<template>
    <b-modal :active.sync="isActive"
        has-modal-card
        trap-focus
        :destroy-on-hide="true"
        aria-role="dialog"
        aria-modal>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">
                    Bulk Action
                </p>
            </header>
            <section class="modal-card-body">
                <user-actions :users.sync="users" />
            </section>
            <footer class="modal-card-foot">
                <button class="button" type="button" @click="isActive = false">Close</button>
            </footer>
        </div>
    </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, Watch } from "vue-property-decorator";
import { AdminUserSDK } from "../../../sdk/admin";
import UserActions from "../partials/UserActions.vue";
import { PresentiUser } from "@presenti/utils";

@Component({
    components: {
        UserActions
    }
})
export default class UserBulkDialog extends Vue {
    @Prop()
    active: boolean;

    @Prop()
    users: AdminUserSDK.PresentiSearchUser[];

    get isActive() {
        return this.active;
    }

    set isActive(newValue) {
        this.$emit('update:active', newValue);
    }

    get uuids() {
        return this.users.map(({ uuid }) => uuid);
    }
}
</script>