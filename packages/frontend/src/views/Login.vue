<template>
  <div class="login section columns is-centered">
    <div class="column is-one-third">
      <h1 class="title is-3">Sign into Presenti</h1>
      <hr>
      <p>
        Presenti is a flexible data aggregation service for statuses across platforms. With a flexible API on multiple protocols, the implementations are limitless.
      </p>
      <br>
      <p>
        By signing into Presenti, you are agreeing to our Terms of Service and Privacy Policy.
      </p>
    </div>
    <div class="column is-one-third">
        <b-tabs v-model="activeTab" class="box">
          <b-loading v-if="loading" :is-full-page="false" :active.sync="loading" />
          <b-tab-item label="Login">
            <ValidationObserver tag="form" v-slot="{ passes }">
              <BInputWithValidation @keyup.native.enter="passes(submit)" rules="required" label="User ID" v-model="userID"/>

              <BInputWithValidation
                @keyup.native.enter="passes(submit)"
                rules="required"
                type="password"
                label="Password"
                vid="password"
                v-model="password"
              />

              <div class="buttons">
                <b-button type="is-primary is-fullwidth" @click="passes(submit)">Login</b-button>
              </div>
            </ValidationObserver>
          </b-tab-item>
          <b-tab-item label="Signup">
            <ValidationObserver tag="form" v-slot="{ passes }">
              <BInputWithValidation @keyup.native.enter="passes(submit)" rules="required" label="User ID" v-model="userID"/>

              <BInputWithValidation
                @keyup.native.enter="passes(submit)"
                rules="required"
                type="password"
                label="Password"
                vid="password"
                v-model="password"
              />

              <BInputWithValidation
                @keyup.native.enter="passes(submit)"
                rules="required|confirmed:password"
                name="Password"
                type="password"
                label="Confirm Password"
                v-model="confirmation"
              />

              <div class="buttons">
                <b-button type="is-primary is-fullwidth" @click="passes(submit)">Signup</b-button>
              </div>
            </ValidationObserver>
          </b-tab-item>
        </b-tabs>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { ValidationObserver } from "vee-validate";
import BInputWithValidation from "../components/inputs/BInputWithValidation.vue";
import apiClient from "../api";
import { isErrorResponse } from "@presenti/client";

@Component({
  components: {
    BInputWithValidation,
    ValidationObserver
  }
})
export default class Login extends Vue {
  public activeTab = 0;

  private password: string = "";
  private confirmation: string = "";
  private userID: string = "";
  private token: string | null = null;
  private loading: boolean = false;

  public beforeMount() {
    if (this.$store.getters["user/isAuthenticated"]) {
      this.$router.push("/");
    }
  }

  public async submit() {
    this.loading = true;

    const { userID, password } = this;

    const json = await apiClient[this.activeTab === 0 ? "login" : "signup"]({ id: userID, password });

    if (isErrorResponse(json)) {
      /** @todo handle error */
      return;
    }

    this.$store.commit("user/update", json);

    this.$router.push("/");

    this.loading = false;
  }

  private url(path: string): string {
    return (new URL(path, "http://127.0.0.1:8138")).toString();
  }
}
</script>