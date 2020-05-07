import { AdapterState, Events, OAUTH_PLATFORM, PipeDirection, PresenceBuilder, PresenceDictionary, PresenceStruct, PresentiAPIClient } from "@presenti/utils";
import { Client, ClientApplication } from "discord.js";
import got from "got";
import { DiscordAPI } from "../api/discord";
import { PresentiAdditionsConfig } from "../structs/config";
import { StorageAdapter } from "../structs/StorageAdapter";
import { log } from "../utils";

export interface DiscordAdapterOptions {
  token: string;
  prefix: string;
  clientID: string;
  clientSecret: string;
}

interface Tagged {
  id: string;
  name: string;
}

interface DiscordIconMap {
  id: string;
  name: string;
  icon: string;
  splash: string;
  overlay: boolean;
  overlayWarn: boolean;
  overlayCompatibilityHook: boolean;
  aliases: string[];
  publishers: Tagged[];
  developers: Tagged[];
  guildId: string | null;
  thirdPartySkus: Array<{ distributor: string, id: string, sku: string }>;
  executables: Array<{ name: string, os: string }>;
  hashes: any[];
  description: string;
  youtubeTrailerVideoId: string | null;
  eulaId: string | null;
  slug: string | null;
}

interface DiscordStorage {
  scopeBindings: {
    [scope: string]: string;
  };
  excludes: {
    [scope: string]: string[];
  };
  spotifyWhitelist: string[];
}

const DEFAULT_STORAGE: DiscordStorage = {
  scopeBindings: {},
  excludes: {},
  spotifyWhitelist: []
}

export class DiscordAdapter extends StorageAdapter<DiscordStorage> {
  client: Client;
  iconRegistry: Record<string, DiscordIconMap> = {};
  log = log.child({ name: "DiscordAdapter" });
  clientData: ClientApplication;
  botAPI: DiscordAPI;
  pipeLedger: Record<string, string> = {};

  static configKey: string = "discord";

  constructor(public readonly options: PresentiAdditionsConfig, private remoteClient: PresentiAPIClient) {
    super("com.ericrabil.discord", DEFAULT_STORAGE);
    this.botAPI = new DiscordAPI(this, remoteClient);
  }

  state: AdapterState = AdapterState.READY;

  async run(): Promise<void> {
    this.log.debug("Connecting to Discord...");
    this.client = new Client();
    let ready = new Promise(resolve => this.client.once("ready", resolve));

    const data: DiscordIconMap[] = await got("https://gist.github.com/EricRabil/b8c959c0abfe0c5628c31ca85ac985dd/raw/").json();
    data.forEach(map => this.iconRegistry[map.id] = map);

    await this.reloadPipeLedger();
    this.log.info(`Loaded pipe ledger with ${Object.keys(this.pipeLedger).length} entry(s)`)
    await this.client.login(this.options.discord.token);

    this.client.on("presenceUpdate", async (_, presence) => {
      const id = presence.user?.id || presence.member?.id || (presence as any)['userID'];
      if (!id) return;
      if (!this.pipeLedger[id]) return;
      this.emit("updated", this.pipeLedger[id]);
    });

    this.remoteClient.subscribe(Events.LINK_CREATE, async link => {
      if (link.platform !== OAUTH_PLATFORM.DISCORD) return;
      if (link.pipeDirection === PipeDirection.PRESENTI || link.pipeDirection === PipeDirection.BIDIRECTIONAL) {
        const scope = await this.remoteClient.resolveScopeFromUUID(link.userUUID);
        if (!scope) return;

        this.pipeLedger[link.platformID] = scope;
        this.emit("updated");
      }
    });

    this.remoteClient.subscribe(Events.LINK_UPDATE, async link => {
      if (link.platform !== OAUTH_PLATFORM.DISCORD) return;
      if (link.pipeDirection === PipeDirection.PRESENTI || link.pipeDirection === PipeDirection.BIDIRECTIONAL) {
        const scope = await this.remoteClient.resolveScopeFromUUID(link.userUUID);
        if (!scope) return;

        this.pipeLedger[link.platformID] = scope;
        this.emit("updated");
      } else if (link.pipeDirection === PipeDirection.PLATFORM || link.pipeDirection === PipeDirection.NOWHERE) {
        const scope = this.pipeLedger[link.platformID];
        if (!scope) return;
        this.pipeLedger[link.platformID] = undefined!;

        this.emit("updated", scope);
      }
    });

    this.remoteClient.subscribe(Events.LINK_REMOVE, link => {
      if (link.platform !== OAUTH_PLATFORM.DISCORD) return;
      const scope = this.pipeLedger[link.platformID];
      if (!scope) return;

      this.pipeLedger[link.platformID] = undefined!;
      this.emit("updated", scope);
    });

    this.client.on("message", async (message) => {
      if (!message.cleanContent.startsWith(this.options.discord.prefix)) return;
      this.botAPI.handleMessage(message, message.cleanContent.substring(this.options.discord.prefix.length).split(" ")[0]);
    });

    await ready;

    this.clientData = await this.client.fetchApplication();

    this.log.info("Connected to Discord.");

    this.state = AdapterState.RUNNING;
  }

  async reloadPipeLedger() {
    let pipes = await this.remoteClient.lookupLinksForPlatform(OAUTH_PLATFORM.DISCORD);
    if (!pipes) return;
    pipes = pipes.filter(pipe => pipe.pipeDirection === PipeDirection.PLATFORM || pipe.pipeDirection === PipeDirection.BIDIRECTIONAL);

    this.pipeLedger = pipes.reduce((acc, { platformID, scope }) => Object.assign(acc, { [platformID]: scope }), {});

    console.log(this.pipeLedger);
  }

  async discordSnowflakeForScope(scope: string) {
    const entry = Object.entries(this.pipeLedger).find(([, pipeScope]) => pipeScope === scope);
    return entry && entry[0] || null;
  }

  async discordPresences(scope: string) {
    const snowflake = await this.discordSnowflakeForScope(scope);
    if (!snowflake) return [];

    return this.client.users.resolve(snowflake)?.presence.activities;
  }

  async userExcludes(scope: string) {
    const container = await this.container();
    const { excludes } = container.data;

    return (excludes[scope] || []).concat("spotify");
  }

  async activityForUser(scope: string): Promise<PresenceStruct[]> {
    const presences = await this.discordPresences(scope);
    const excludes = await this.userExcludes(scope);
    return presences?.filter(activity => !excludes.includes(activity.name.toLowerCase()))
      .map(activity => (
        new PresenceBuilder()
          .title(activity.name)
          .largeText(activity.details || activity.assets?.largeText!)
          .image((activity.assets?.largeImage || activity.assets?.smallImage) ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${activity.assets?.largeImage || activity.assets?.smallImage}.png` : this.iconRegistry[activity.applicationID!]?.icon ? `https://cdn.discordapp.com/app-icons/${activity.applicationID}/${this.iconRegistry[activity.applicationID!].icon}.webp?size=256&keep_aspect_ratio=false` : null)
          .smallText(activity.state!)
          .start(activity.timestamps?.start?.getTime()!)
          .stop(activity.timestamps?.end?.getTime()!)
          .id(activity.applicationID)
          .presence
      )) || [];
  }

  /**
   * Returns all activities, useful for service initialization
   */
  async activities() {
    const container = await this.container();
    /** Maps a discord snowflake to all bound scopes */
    const snowflakes = Object.values(container.data.scopeBindings).filter((s, i, a) => a.indexOf(s) === i);
    const activities = snowflakes.reduce((acc, snowflake) => Object.assign(acc, { [snowflake]: this.activityForUser(this.pipeLedger[snowflake]) }), {} as Record<string, PresenceStruct[]>);

    return Object.entries(container.data.scopeBindings).reduce((acc, [scope, snowflake]) => Object.assign(acc, { [scope]: activities[snowflake] }), {} as PresenceDictionary);
  }
}