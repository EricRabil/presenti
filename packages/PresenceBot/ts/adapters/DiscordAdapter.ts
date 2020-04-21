import got from "got";
import { PresenceAdapter, AdapterState, Presence, PresenceStruct, PresenceBuilder } from "remote-presence-utils";
import { Client, Activity } from "discord.js";

export interface DiscordAdapterOptions {
  token: string;
  user: string;
  overrides: string[];
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

export class DiscordAdapter extends PresenceAdapter {
  client: Client;
  iconRegistry: Record<string, DiscordIconMap> = {};

  constructor(public readonly options: DiscordAdapterOptions) {
    super();
  }

  state: AdapterState = AdapterState.READY;

  async run(): Promise<void> {
    this.client = new Client();

    const data: DiscordIconMap[] = await got("https://gist.github.com/EricRabil/b8c959c0abfe0c5628c31ca85ac985dd/raw/").json();
    data.forEach(map => this.iconRegistry[map.id] = map);

    await this.client.login(this.options.token);

    this.client.on("presenceUpdate", (_, presence) => {
      const id = presence.user?.id || presence.member?.id || (presence as any)['userID'];
      if (!id) return;
      if (this.options.user !== id) return;
      this.emit("presence");
    });

    this.state = AdapterState.RUNNING;
  }

  get user() {
    return this.client.users.resolve(this.options.user);
  }

  async activity(): Promise<PresenceStruct[]> {
    return this.user?.presence.activities
      .filter(activity => !this.options.overrides.includes(activity.name))
      .map(activity => (
        console.log(activity),
        new PresenceBuilder()
          .title(activity.name)
          .largeText(activity.details || activity.assets?.largeText!)
          .image((activity.assets?.largeImage || activity.assets?.smallImage) ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${activity.assets?.largeImage || activity.assets?.smallImage}.png` : `https://cdn.discordapp.com/app-icons/${activity.applicationID}/${this.iconRegistry[activity.applicationID!].icon}.webp?size=256&keep_aspect_ratio=false`)
          .smallText(activity.state!)
          .start(activity.timestamps?.start?.getTime()!)
          .stop(activity.timestamps?.end?.getTime()!)
          .presence
      )) || [];
  }
}