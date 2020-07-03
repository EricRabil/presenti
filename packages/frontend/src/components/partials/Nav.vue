<template>
  <b-navbar type="is-info" wrapper-class="container">
    <template slot="brand">
      <b-navbar-item class="brand-wrap">
        <Logo class="brand-logo" />
      </b-navbar-item>
    </template>
    <template slot="start">
      <b-navbar-item tag="router-link" active-class="is-active" to="/" exact>
        Home
      </b-navbar-item>
      <b-navbar-dropdown label="Developer">
        <b-navbar-item tag="router-link" active-class="is-active" to="/developer/builder" exact>
          Presence Builder
        </b-navbar-item>
        <b-navbar-item tag="router-link" active-class="is-active" to="/developer/presence/ws" exact>
          Presence API (WebSocket)
        </b-navbar-item>
        <b-navbar-item tag="router-link" active-class="is-active" to="/developer/presence/rest" exact>
          Presence API (REST)
        </b-navbar-item>
        <b-navbar-item tag="router-link" active-class="is-active" to="/developer/remote/ws" exact>
          Remote API (WebSocket)
        </b-navbar-item>
      </b-navbar-dropdown>
    </template>
    <template slot="end">
      <fade>
        <b-navbar-item v-if="!authenticated" tag="router-link" active-class="is-active" to="/login" exact>
          Log In
        </b-navbar-item>
        <b-navbar-dropdown :label="name" v-else>
          <b-navbar-item tag="router-link" active-class="is-active" to="/settings/security">
            Security
          </b-navbar-item>
          <b-navbar-item @click="signOut">
            Sign Out
          </b-navbar-item>
        </b-navbar-dropdown>
      </fade>
    </template>
  </b-navbar>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Logo from "../../assets/logo.svg?inline";

@Component({
  components: {
    Logo
  }
})
export default class Nav extends Vue {
  public signOut() {
    this.$store.dispatch("user/logout");
    this.$router.push("/login").catch((e) => null);
  }

  get authenticated() {
    return this.$store.getters["user/isAuthenticated"];
  }

  get name() {
    return this.$store.getters["user/name"];
  }
}
</script>

<style lang="scss">
.brand-wrap {
  & > .brand-logo {
    height: 1rem;
    width: auto;
    fill: white;
  }
}
</style>