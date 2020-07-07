<template>
  <div class="home">
    <h1>Presenti Dashboard</h1>
    <p>To enter your dashboard, enter your user ID (scope) to load your Presence data.</p>
    <div class="input-group">
      <input type="text" class="form-control" placeholder="Scope" aria-label="Scope" v-model="scope">
      <div class="input-group-append">
        <button class="btn btn-secondary" type="button" @click="loadDashboard" :disabled="!canLoadDashboard">Load</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class Home extends Vue {
  scope: string | null = null;

  get canLoadDashboard() {
    return !!this.scope;
  }

  loadDashboard() {
    this.$router.push(`/scope/${this.scope}`);
  }
}
</script>

<style lang="scss">
#app > .home {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;

  & .input-group {
    width: -webkit-fill-available;
    max-width: 580px;
    margin: 10px 25px;
  }
}
</style>