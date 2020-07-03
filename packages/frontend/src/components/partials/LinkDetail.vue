<template>
  <div>
    <div class="link-detail-header is-vcentered">
      <oauth-icon :definition="definition" />
      <div class="link-detail-title">{{definition.name}}</div>
      <div class="link-header-spacer" />
      <div v-if="isLinked" class="buttons">
        <b-button type="is-primary" :disabled="!hasChanges" @click="save">Save</b-button>
        <b-button type="is-danger" @click="unlink">Unlink</b-button>
      </div>
    </div>
    <hr>
    <!-- Details of existing link -->
    <div v-if="isLinked">
      <div class="block">
        <b-field label="Presence Destination">
        </b-field>
        <b-radio v-model="directionSelection" v-for="(item, index) in directions" :key="index"
          :name="definition.name"
          :native-value="index">
          {{item}}
        </b-radio>
      </div>
      <b-field v-if="linkDataVisible" label="Platform ID">
        <b-input v-model="information.platformID" disabled></b-input>
      </b-field>
    </div>
    <!-- User Entry -->
    <ValidationObserver tag="form" v-if="userCanInput && !isLinked" v-slot="{ passes }">
      <BInputWithValidation rules="required" label="Platform Qualifier" v-model="userEntry"/>

      <div class="buttons">
        <b-button type="is-primary" @click="passes(submitUserEntry)">Link</b-button>
      </div>
    </ValidationObserver>
  </div>
</template>

<script lang="ts">
import { ValidationObserver } from "vee-validate";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { OAuthModuleDefinition, PresentiLink, OAUTH_PLATFORM, PipeDirection } from "@presenti/utils";
import BInputWithValidation from "../inputs/BInputWithValidation.vue";
import apiClient from "../../api";
import { isErrorResponse } from "@presenti/client";

@Component({
  components: {
    BInputWithValidation,
    ValidationObserver
  }
})
export default class LinkDetail extends Vue {
  @Prop()
  public definition: OAuthModuleDefinition;

  @Prop({ default: null })
  public information: PresentiLink | null;

  public userEntry: string = "";
  public directionSelection: number = this.information?.pipeDirection || 0;
  public directionChanged = false;
  public platformSettingsChanged = false;

  public colors = {
    [OAUTH_PLATFORM.SPOTIFY]: "#7ab800",
    [OAUTH_PLATFORM.SPOTIFY_INTERNAL]: "#7ab800",
    [OAUTH_PLATFORM.DISCORD]: "#7289da"
  };

  public async submitUserEntry() {
    if (!this.definition.link) {
      /** @todo handle shouldnt have been called */
      return;
    }

    const result: PresentiLink = await apiClient.ajax.post(this.definition.link, { body: { userEntry: this.userEntry } });

    if (isErrorResponse(result)) {
      /** @todo explain what the fuck went wrong bitch */
      return;
    }

    this.$store.commit("user/addPlatform", { platform: this.definition.key, data: result });
  }

  public async save() {
    if (!this.information) { return; }
    if (this.directionChanged) {
      await apiClient.updateMyPipeDirection(this.information.uuid, this.directionSelection);
    }

    if (this.platformSettingsChanged) {
      /** @todo platform settings changed handle */
    }

    this.directionChanged = this.platformSettingsChanged = false;
  }

  public async unlink() {
    if (!this.information) { return; }
    await this.$store.dispatch("user/unlink", this.information.platform);
  }

  @Watch("directionSelection")
  public directionSelectionChanged() {
    this.directionChanged = true;
  }

  get hasChanges() {
    return this.directionChanged || this.platformSettingsChanged;
  }

  get linkDataVisible() {
    /** when this is false, the data is not supplied by the server */
    return this.definition.schema?.contentsVisible !== false;
  }

  get isLinked() {
    return !!this.information;
  }

  get userCanInput() {
    return this.definition.schema?.type === "entry";
  }

  get directions() {
    return Object.entries(PipeDirection).filter(([key]) => !isNaN(+key)).reduce((acc, [k, v]) => acc.concat(v as string), [] as string[]).map((uglyName) => {
      uglyName = uglyName.toLowerCase();
      if (uglyName === "platform") { uglyName = this.definition?.name || uglyName; }
      return uglyName.replace(/\b[a-z]/g, (x: string) => x.toUpperCase()) as string;
    });
  }
}
</script>

<style lang="scss">
.link-detail-header {
  width: 100%;
  display: flex;
  flex-flow: row;
  align-items: center;

  & > .link-detail-title {
    margin-left: 5px;
    margin-right: 0;
    width: fit-content;
  }

  & > .link-header-spacer {
    flex-grow: 1;
  }
}

form > .buttons {
  margin-top: 10px;
}
</style>