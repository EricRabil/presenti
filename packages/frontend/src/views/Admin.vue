<template>
    <div class="admin section">
        <user-search />
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import UserSearch from "@/components/admin/UserSearch.vue";

@Component({
    components: {
        UserSearch
    }
})
export default class Admin extends Vue {

}
</script>