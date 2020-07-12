<template>
    <div>
        <b-field class="user-search-controls" grouped>
            <b-button :disabled="!controlsEnabled" class="control is-link" @click="removeSortingPriority">
                Reset Sorting
            </b-button>

            <b-input placeholder="Search"
                icon="user"
                class="user-search-filter"
                v-model="query"
                >
            </b-input>

            <b-select placeholder="Select number per page" v-model="maxResults">
                <option
                    v-for="option in maxResultsOptions"
                    :value="option"
                    :key="option">
                    {{ option }} per page
                </option>
            </b-select>

            <b-button :disabled="checkedRows.length === 0" class="control is-success" @click="bulkDialogVisible = true">
                Bulk Action
            </b-button>
        </b-field>

        <b-table
            :data="results"
            ref="table"
            paginated
            :per-page="maxResults"
            checkable
            backend-sorting
            backend-pagination
            :total="total"
            :current-page.sync="page"
            :checked-rows.sync="checkedRows"
            detailed
            detail-key="uuid"
            @sort="sortPressed"
            @sorting-priority-removed="sortingPriorityRemoved"

            aria-next-label="Next page"
            aria-previous-label="Previous page"
            aria-page-label="Page"
            aria-current-label="Current page"
        >
            <template slot-scope="props">
                <b-table-column field="userID" label="User ID" sortable>
                    {{ props.row.userID }}
                </b-table-column>

                <b-table-column field="displayName" label="Display Name">
                    {{ props.row.displayName }}
                </b-table-column>

                <b-table-column field="createDate" label="Date Created" sortable>
                    {{ props.row.createDate }}
                </b-table-column>
            </template>

            <template slot="detail" slot-scope="props">
                <user-details v-model="results[props.index]" />
            </template>
        </b-table>

        <user-bulk-dialog :active.sync="bulkDialogVisible" :users="checkedRows" />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { BuefyTable } from "../../buefy";
import { AdminUserSDK } from "../../sdk/admin";
import UserDetails from "./partials/UserDetails.vue";
import UserBulkDialog from "./dialogs/UserBulkDialog.vue";
import moment from "moment";

@Component({
    components: {
        UserDetails,
        UserBulkDialog
    }
})
export default class UserSearch extends Vue {
    public result: AdminUserSDK.UserSearchResult | null = null;
    public query: string = "";
    public sort: { field: string, order: string } | null = null;
    public page: number = 1;
    public maxResults: number = 10;
    public checkedRows: AdminUserSDK.UserSearchResult[] = [];
    public bulkDialogVisible: boolean = false;

    maxResultsOptions = [10, 15, 20, 50, 100];

    $refs: {
        table: BuefyTable<AdminUserSDK.UserSearchResult>;
    }

    @Watch("query", { immediate: true })
    @Watch("sort", { deep: true })
    @Watch("maxResults")
    @Watch("page")
    public async loadAsyncData() {
        const newResults = await AdminUserSDK.searchUsers({ query: this.query, page: this.page, sort: this.sortOption, max: this.maxResults });
        
        this.result = { total: 0, results: [] };
        await this.$nextTick();
        
        newResults.results = newResults.results.map(({ createDate, ...result }) => {
            createDate = moment(createDate).format('LLL');
            return { createDate, ...result };
        });
        this.result = newResults;
    }

    private async removeSortingPriority() {
        this.$refs.table.resetMultiSorting();
        this.$refs.table.currentSortColumn = {};
        this.$refs.table.isAsc = true;
        this.sort = null;
    }

    private sortPressed(field: string, order: string) {
        this.sort = { field, order };
    }

    private sortingPriorityRemoved() {
        return this.loadAsyncData();
    }

    get results() {
        return this.result?.results || [];
    }

    get total() {
        return this.result?.total || 0;
    }

    get sortOption(): AdminUserSDK.SearchParameters['sort'] {
        if (!this.sort) return;
        if (typeof this.sort === "string") return this.sort;
        return [{ [this.sort.field]: this.sort.order }] as any;
    }

    get controlsEnabled() {
        return this.total > 0 && this.sortOption;
    }
}
</script>

<style lang="scss">
.user-search-controls {
    & > .user-search-filter {
        flex-grow: 1;
    }
}
</style>