<template>
    <div class="live-date">
        {{dateString}}
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import moment from "moment";

@Component
export default class LiveDate extends Vue {
    dateString = this.getDateString();
    ticker = 0;

    mounted() {
        this.ticker = setInterval(() => {
            this.dateString = this.getDateString();
        }, 500) as unknown as number;
    }

    getDateString() {
        return moment().format('dddd LL');
    }
}
</script>

<style lang="scss">
.live-date {
    line-height: 1;
}
</style>