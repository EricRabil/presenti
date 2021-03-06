<template>
  <div class="login section columns is-centered">
    <div class="column is-one-fourth">
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
    <div class="column is-one-fourth">
        <b-tabs v-model="activeTab" class="box">
          <error v-model="error" />
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
              <b-field class="validating-group" grouped>
                <BInputWithValidation @keyup.native.enter="passes(submit)" rules="required" label="User ID" vid="userID" :errors="errors.userID" v-model="userID" expanded />

                <BInputWithValidation @keyup.native.enter="passes(submit)" rules="required" label="Display Name" vid="displayName" :errors="errors.displayName" v-model="displayName" expanded />
              </b-field>

              <BInputWithValidation @keyup.native.enter="passes(submit)" rules="required|email" type="email" vid="email" label="Email" :errors="errors.email" v-model="email"/>

              <BInputWithValidation
                @keyup.native.enter="passes(submit)"
                :errors="errors.password"
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
import apiClient, { GENERIC_ERROR } from "../api";
import { isErrorResponse } from "@presenti/client";
import { APIError } from "@presenti/utils";

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
  private email: string = "";
  private displayName: string = "";
  private token: string | null = null;
  private loading: boolean = false;

  private errors: Record<string, string[]> = {};
  private error: APIError | null = null;

  public beforeMount() {
    if (this.$store.getters["user/isAuthenticated"]) {
      this.$router.push("/");
    }
  }

  public async submit() {
    this.loading = true;

    const { userID, password } = this;

    try {
      var json = await apiClient[this.activeTab === 0 ? "login" : "signup"](this.body as any);
    } catch (e) {
      if (e instanceof APIError) {
        if (e.items) this.errors = e.items;
        else if (e.message) this.error = e;
        else return;

        return this.loading = false;
      }

      this.error = GENERIC_ERROR;
      this.loading = false;

      return;
    }

    if (isErrorResponse(json)) {
      /** @todo handle error */
      return;
    }

    this.$store.commit("user/update", json);

    this.$router.push("/");

    this.loading = false;
  }

  get body() {
    const base = { id: this.userID, password: this.password };
    var merge = {};

    if (this.activeTab === 1) {
      merge = { displayName: this.displayName, email: this.email };
    }

    return Object.assign(base, merge);
  }

  private url(path: string): string {
    return (new URL(path, "http://127.0.0.1:8138")).toString();
  }
}
</script>

<style lang="scss">
.field.is-grouped.validating-group {
  margin: 0;

  & > .field.is-expanded {
    margin-bottom: 0;
  }
}
</style>