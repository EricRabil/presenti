<template>
  <div class="tile is-child has-text-centered" v-if="user">
    <h1 class="title is-4">Hi, {{name}}</h1>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { PresentiUser } from "@presenti/utils";

@Component
export default class UserProfile extends Vue {
  @Prop()
  public user: PresentiUser | null;

  get name() {
    if (!this.user) { return null; }
    return this.user.displayName || this.user.userID;
  }
}
</script>