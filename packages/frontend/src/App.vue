<template>
  <div v-if="!isLoading" id="app">
    <navigator></navigator>
    <main class="container">
      <fade>
        <router-view />
      </fade>
    </main>
  </div>
  <div v-else>
    <b-loading :is-full-page="true" :active.sync="isLoading" :can-cancel="false"></b-loading>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { isErrorResponse } from "@presenti/client";
import router from "./router";
import apiClient from "./api";

@Component
export default class App extends Vue {
  public isLoading: boolean = true;

  public async created() {
    const me = await this.$store.dispatch("user/getUser");
    const platforms = await this.$store.dispatch("platforms/getPlatforms");

    if (me && this.$store.getters["router/loginRedirect"]) {
      this.$router.push(this.$store.getters["router/loginRedirect"]);
      this.$store.commit("router/updateLoginRedirect", null);
    }

    this.isLoading = false;
  }
}
</script>

<style lang="scss">
@import "~bulma/sass/utilities/_all";
@import "~bulma";

@import "~buefy/src/scss/buefy";
@import "./assets/styles/style.scss";
</style>