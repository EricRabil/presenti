<template>
  <div class="columns presence-builder" :style="{ 'flex-flow': layout }">
    <div :class="['column', {'is-7': layout === 'row'}]">
      <h5 class="title is-5">Presence Builder</h5>
      <h5 class="subtitle is-5">Fill out the fields below to see how a Presence is composed</h5>
      <text-builder v-model="title" prefix="Title" />
      <text-builder v-model="largeText" prefix="Large" />
      <b-field label="Small Texts">
        <b-numberinput :min="0" v-model="smallTextsQuantity"></b-numberinput>
      </b-field>
      <text-builder
        v-for="(_, index) of smallTexts"
        :key="index"
        v-model="smallTexts[index]"
        prefix="Small"
      />
      <div class="columns">
        <b-field class="column is-6" label="Image Source (base64 or URL)">
          <b-input v-model="image" />
        </b-field>
        <b-field class="column is-6" label="Image Link">
          <b-input v-model="imageLink" />
        </b-field>
      </div>
      <div class="columns">
        <b-field class="column is-2" label="Paused">
          <BCheckboxTS v-model="paused" />
        </b-field>
        <b-field class="column is-5" label="Start Time (UNIX Epoch)">
          <b-numberinput v-model="start" />
        </b-field>
        <b-field class="column is-5" label="Stop Time (UNIX Epoch)">
          <b-numberinput v-model="stop" />
        </b-field>
      </div>
      <div class="columns">
        <b-field class="column is-3" label="Gradient Enabled">
          <BCheckboxTS v-model="gradientEnabled" />
        </b-field>
        <b-field class="column is-9" label="Gradient Priority">
          <b-numberinput v-model="gradientPriority" />
        </b-field>
      </div>
    </div>
    <div class="column is-1"></div>
    <div :class="['column', {'is-4': layout === 'row'}]">
      <b-tabs v-model="activeTab">
        <b-tab-item label="JSON">
          <codemirror v-model="json" :options="codemirrorOptions" />
        </b-tab-item>
        <b-tab-item label="Rendered">
          <PresentiPresence :presence="presence" />
        </b-tab-item>
      </b-tabs>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from "vue-property-decorator";
import { PresentiPresence } from "@presenti/renderer";
import {
  PresenceStruct,
  PresenceBuilder,
  PresenceText,
  isPresentiText
} from "@presenti/utils";
import { codemirror } from "vue-codemirror";
import "codemirror/lib/codemirror.css";
import BCheckboxTS from "../inputs/BCheckbox+ThirdState.vue";
import PresenceTextBuilder from "./partials/PresenceTextBuilder.vue";

@Component({
  components: {
    codemirror,
    PresentiPresence,
    TextBuilder: PresenceTextBuilder,
    BCheckboxTS
  }
})
export default class PresencePreview extends Vue {
  public id: string | null = null;
  public title: PresenceText = {
    text: null!,
    link: null!,
    type: "text"
  };
  public largeText: PresenceText = {
    text: null!,
    link: null!,
    type: "text"
  };
  public smallTexts: PresenceText[] = [
    {
      text: null!,
      link: null!,
      type: "text"
    }
  ];
  public image: string | null = null;
  public imageLink: string | null = null;
  public start: number | null = null;
  public stop: number | null = null;
  public gradientEnabled: boolean | null = null;
  public gradientPriority: number = 0;
  public paused: boolean | null = null;

  public activeTab: number = 0;
  public smallTextsQuantity: number = 1;

  public codemirrorOptions = {
    readOnly: true,
    lineWrapping: true
  };

  @Prop({ default: "row" })
  public layout: "row" | "column";

  @Watch("smallTextsQuantity")
  public smallTextsQuantityChanged(newValue: number, oldValue: number) {
    const diff = newValue - oldValue;

    if (diff < 0) {
      this.smallTexts.splice(
        this.smallTexts.length - Math.abs(diff),
        Math.abs(diff)
      );
    } else {
      for (let i = 0; i < diff; i++) {
        this.smallTexts.push({
          text: null!,
          link: null!,
          type: null!
        });
      }
    }
  }

  get presence() {
    const builder = new PresenceBuilder()
      .id(this.id)
      .title(this.title)
      .largeText(this.largeText)
      .image(this.image, this.imageLink)
      .start(this.start === 0 ? null : this.start)
      .stop(this.stop === 0 ? null : this.stop)
      .gradient(this.gradientEnabled!, this.gradientPriority)
      .paused(this.paused!);

    const { presence } = this.smallTexts.reduce(
      (builder, text) => builder.smallText(text),
      builder
    );

    return presence;
  }

  get json() {
    const json = JSON.stringify(
      this.presence,
      (key, value) => {
        if (
          Array.isArray(value) &&
          value.filter((f) => !!this.cleanseText(f)).length === 0
        ) {
          return null;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          typeof value.text !== "undefined"
        ) {
          if (!value.text) {
            return null;
          }
          return this.cleanseText(value);
        }
        return value;
      },
      4
    );

    this.$emit("input", JSON.parse(json));

    return json;
  }

  set json(newValue) {
    /** noop */
  }

  public cleanseText(value: typeof PresenceBuilder.prototype.largeText) {
    const cleansed = Object.entries(value).reduce((acc, [key, value]) => {
      switch (key) {
        case "text":
        case "link":
          if (value) {
            return Object.assign(acc, { [key]: value });
          }
          break;
        case "type":
          if (value !== "text") {
            return Object.assign(acc, { [key]: value });
          }
          break;
      }
      return acc;
    }, {}) as { text: string | null; link: string | null; type: string | null };

    if (cleansed.text && !cleansed.link && !cleansed.type) {
      return cleansed.text;
    }
    if (Object.keys(cleansed).length === 0) {
      return null;
    }
    return cleansed;
  }
}
</script>

<style lang="scss">
.presence-builder .CodeMirror {
  min-height: 600px !important;
}
</style>