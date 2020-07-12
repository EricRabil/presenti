import Vue from "vue";

export declare interface BuefyTable<T = any> extends Vue {
    //#region props
    data: T[];
    columns: object[];
    defaultSort: string | string[];
    defaultSortDirection: "asc" | "desc";
    sortIcon: string;
    sortIconSize: "is-small" | "is-medium" | "is-large";
    bordered: boolean;
    striped: boolean;
    narrowed: boolean;
    /** .sync-able */
    selected?: object;
    focusable: boolean;
    hoverable: boolean;
    checkable: boolean;
    checkboxPosition: "left" | "right";
    /** .sync-able */
    checkedRows?: object[];
    headerClickable: boolean;
    mobileCards: boolean;
    backendSorting: boolean;
    backendPagination: boolean;
    total: number;
    /** .sync-able */
    currentPage: number;
    loading: boolean;
    pagination: boolean;
    paginationSimple: boolean;
    paginationSize?: "is-small" | "is-medium" | "is-large";
    paginationPosition: "bottom" | "top" | "both";
    perPage: number;
    sortMultiple: boolean;
    sortMultipleData: Array<{field: string; order: string;}>;
    sortMultipleKey: null | "shiftKey" | "altKey" | "ctrlKey";
    rowClass?: (row: T, index: number) => string;
    detailed: boolean;
    customDetailRow: boolean;
    showDetailIcon: boolean;
    openedDetailed: T[];
    hasDetailedVisible: boolean;
    detailKey?: string;
    customIsChecked?: (a: T, b: T) => boolean;
    isRowCheckable?: (row: T) => boolean;
    isRowSelectable?: (row: T) => boolean;
    iconPack: "mdi" | "fa" | "fas" | "far" | "fad" | "fal";
    mobileSortPlaceholder?: string;
    customRowKey?: string;
    draggable: boolean;
    backendFiltering: boolean;
    stickyHeader: boolean;
    scrollable: boolean;
    height?: number | string;
    filtersEvent?: string;
    cardLayout: boolean;
    ariaNextLabel?: string;
    ariaPreviousLabel?: string;
    ariaPageLabel?: string;
    ariaCurrentLabel?: string;
    //#endregion

    //#region data
    currentSortColumn?: T | object;
    isAsc: boolean;
    //#endregion

    //#region methods
    initSort(): void;
    focus(): void;
    toggleDetails(row: object): void;
    openDetailRow(row: object): void;
    closeDetailRow(row: object): void;
    resetMultiSorting(): void;
    //#endregion
}