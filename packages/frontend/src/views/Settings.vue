<template>
  <div class="settings section">
    <div class="columns">
      <div class="column is-4">
        <b-button v-for="module of moduleMetadata" :key="module.section" tag="router-link" :to="`/settings/${module.section}`" active-class="is-light" exact expanded>
          {{module.displayName}}
        </b-button>
      </div>
      <div class="column is-1"></div>
      <div class="column is-7">
        <component v-if="activeModule" :is="activeModule" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { VueConstructor } from "vue";
import Security from "../components/settings/Security.vue";

interface SettingsModule extends VueConstructor {
  displayName: string;
}

interface ModuleMetadata {
  displayName: string;
  section: string;
}

@Component
export default class Settings extends Vue {
  static modules: Record<string, SettingsModule> = {
    security: Security
  }

  get moduleMetadata(): ModuleMetadata[] {
    return Object.entries(Settings.modules).reduce((acc, [ section, { displayName } ]) => acc.concat({ section, displayName }), [])
  }

  get activeModule(): SettingsModule | null {
    return Settings.modules[this.$route.params.section] || null;
  }
}

new Settings()
</script>