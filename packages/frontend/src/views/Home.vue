<template>
  <div class="home section tile is-ancestor">
    <div class="tile is-vertical is-12">
      <UserProfile class="tile is-12" :user="model"></UserProfile>
      <div class="columns tile is-12 is-parent">
        <div class="column is-7 is-vertical">
          <h5 class="title is-5 is-marginless">Integrations</h5>
          <hr />
          <div v-if="linkButtons.length > 0">
            <h5 class="subtitle is-6 is-skinny">Connect to a platform</h5>
            <div class="level buttons">
              <LinkButton
                v-for="platform of linkButtons"
                class="level-item"
                :key="platform.key"
                :definition="platform"
                :model="model"
              ></LinkButton>
            </div>
          </div>
          <div class="tile is-parent is-vertical">
            <template v-for="platform of platformDetails">
              <LinkDetail
                class="tile is-child box"
                :key="platform.key"
                :definition="platform"
                :information="model.platforms[platform.key]"
              ></LinkDetail>
            </template>
          </div>
        </div>
        <div class="column is-1"></div>
        <div class="column is-4 presence-holder">
          <h5 class="title is-5 is-marginless">Your Presences</h5>
          <hr />
          <h6
            class="subtitle is-6 presence-holder-notice" v-show="!showRenderer"
          >You don't have any presences! Connect a platform to get started.</h6>
          <status-renderer v-show="showRenderer" @changed="showRenderer = $event > 0" :scope="model.userID" :url="streamingEndpoint" ref="renderer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import UserProfile from "../components/partials/UserProfile.vue";
import { mapGetters } from "vuex";
import LinkDetail from "../components/partials/LinkDetail.vue";
import LinkButton from "../components/partials/LinkButton.vue";
import { OAuthModuleDefinition, PresentiUser } from "@presenti/utils";
import { apiEndpoint } from "../api";
import { StatusRenderer } from "@presenti/renderer";

@Component({
  computed: mapGetters({
    model: "user/model",
    platforms: "platforms/platforms"
  }),
  components: {
    UserProfile,
    LinkDetail,
    LinkButton
  }
})
export default class Home extends Vue {
  public platforms: OAuthModuleDefinition[];
  public model: PresentiUser;
  public showRenderer = false;

  public $refs: {
    renderer: StatusRenderer;
  };

  public async mounted() {}

  get presencesEmpty() {
    return true;
  }

  get linkButtons() {
    return this.platforms
      .filter((platform) => !this.model.platforms![platform.key])
      .filter((platform) => platform.schema?.type !== "entry");
  }

  get platformDetails() {
    return this.platforms.filter(
      (platform) =>
        platform.schema?.type === "entry" || this.model.platforms![platform.key]
    );
  }

  get streamingEndpoint() {
    const endpoint = "ws://127.0.0.1:8138";
    const url = new URL(`${endpoint}/presence/`);
    url.protocol = "ws:";
    return url.href;
  }
}
</script>

<style lang="scss">
.presence-holder {
  display: flex;
  flex-flow: column;
  flex-grow: 1;

  & > .presence-holder-notice {
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    flex-grow: 1;
    max-height: 500px;
  }

  & .status-holder {
    flex-flow: column;
    width: 100%;

    & .presence-root {
      margin: 10px 0 !important;
    }
  }
}

.home .subtitle.is-skinny {
  margin-bottom: 1rem;
}
</style>