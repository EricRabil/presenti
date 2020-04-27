import crypto from "crypto";
import got from "got";
import { PresenceAdapter, AdapterState, Presence, PresenceStruct, PresenceBuilder } from "remote-presence-utils";
import { Client, Activity, Util, ClientApplication } from "discord.js";
import { StorageAdapter } from "../structs/StorageAdapter";
import { log } from "../utils";
import { PresentiAdditionsService } from "..";
import { PresenceDictionary } from "presenti/dist/utils/presence-magic";

export interface DiscordAdapterOptions {
  token: string;
  prefix: string;
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

/**
 * This cannot be piped remotely.
 */
export class DiscordAdapter extends StorageAdapter<DiscordStorage> {
  client: Client;
  iconRegistry: Record<string, DiscordIconMap> = {};
  log = log.child({ name: "DiscordAdapter" });
  linkLocks: Record<string, ReturnType<typeof setTimeout>> = {};
  linkLockWarns: Record<string, boolean | undefined> = {};
  clientData: ClientApplication;

  constructor(public readonly options: DiscordAdapterOptions, private service: PresentiAdditionsService) {
    super("com.ericrabil.discord", DEFAULT_STORAGE);
  }

  state: AdapterState = AdapterState.READY;

  async run(): Promise<void> {
    this.log.debug("Connecting to Discord...");
    this.client = new Client();
    let ready = new Promise(resolve => this.client.once("ready", resolve));

    const data: DiscordIconMap[] = await got("https://gist.github.com/EricRabil/b8c959c0abfe0c5628c31ca85ac985dd/raw/").json();
    data.forEach(map => this.iconRegistry[map.id] = map);

    await this.client.login(this.options.token);

    this.client.on("presenceUpdate", async (_, presence) => {
      const id = presence.user?.id || presence.member?.id || (presence as any)['userID'];
      if (!id) return;

      const storage = await this.container();
      const scopes = Object.entries(storage.data.scopeBindings).filter(([,snowflake]) => snowflake === id).map(([scope]) => scope);
      if (scopes.length === 0) return;

      scopes.forEach(scope => this.emit("updated", scope));
    });

    this.client.on("message", async (message) => {
      if (!message.cleanContent.startsWith(this.options.prefix)) return;
      const [ command, ...args ] = message.cleanContent.substring(this.options.prefix.length).split(" ");

      switch (command) {
        case "link": {
          if (message.channel.type !== "dm") return message.delete().then(() => message.channel.send(`<@${message.author.id}>, please run \`!link\` over DM. It is insecure to post your link code in public channels.`));
          if (this.linkLocks[message.author.id]) {
            this.deferLinkLock(message.author.id);
            if (!this.linkLockWarns[message.author.id]) {
              message.reply("Sorry! You can only run `!link` once every few seconds. Please wait a few moments, then try again.");
              this.linkLockWarns[message.author.id] = true;
            }
            return;
          }
          const [ userID, code ] = args;
          if (!code || !userID) return message.reply(`Usage: \`${this.options.prefix}link {userID} {code}\``);
          const storage = await this.container();
          
          if (storage.data.scopeBindings[userID] === message.author.id) return message.reply(`You are already linked to \`${Util.removeMentions(userID)}\``)

          this.deferLinkLock(message.author.id);

          const success = await this.service.client.validateCode(userID, code);
          if (!success) return message.reply(`Sorry, the link code you provided is either invalid or expired.`);

          storage.data.scopeBindings[userID] = message.author.id;
          await storage.save();

          this.emit("updated", userID);
          message.reply(`Presences for <@${message.author.id}> will now pipe to \`${Util.removeMentions(userID)}\``)
          break;
        }
        case "unlink": {
          const [ userID ] = args;
          if (!userID) return message.reply(`Usage: \`${this.options.prefix}unlink {userID}\``);

          const storage = await this.container();
          if (storage.data.scopeBindings[userID] !== message.author.id) return message.reply(`Sorry, ${Util.removeMentions(userID)} is not linked to your account.`);

          delete storage.data.scopeBindings[userID];
          await storage.save();

          message.reply(`Successfully unlinked ${Util.removeMentions(userID)} from your account.`);

          this.emit("updated", userID);
          break;
        }
        case "link-state": {
          const storage = await this.container();
          const scopes = Object.entries(storage.data.scopeBindings).filter(([scope, snowflake]) => snowflake === message.author.id).map(([scope]) => Util.removeMentions(scope));

          if (scopes.length === 1) message.reply(`You are currently linked to \`${scopes[0]}\``)
          else if (scopes.length > 1) message.reply(`\`\`\`md\n# Here are the scopes linked to your account:\n\n${scopes.map(scope => `- ${scope}`).join("\n")}\n\`\`\``);
          else message.reply(`You are not linked to any users right now.`);
          break;
        }
        case "s-approve": {
          if (message.author.id !== this.clientData.owner?.id) {
            return message.reply("Sorry, only the bot owner can approve access to the private Spotify adapter.");
          }

          const storage = await this.container();
          const whitelist = (storage.data.spotifyWhitelist || (storage.data.spotifyWhitelist = []));
          const toAdd = message.mentions.users.map(u => u.id).filter(id => !whitelist.includes(id));
          storage.data.spotifyWhitelist = storage.data.spotifyWhitelist.concat(toAdd);
          await storage.save();

          return message.reply(`\`\`\`md\n# Added the following users to the whitelist:\n\n${message.mentions.users.map(u => `- ${u.username}#${u.discriminator}`).join("\n")}\n\`\`\``);
        }
        case "s-revoke": {
          if (message.author.id !== this.clientData.owner?.id) {
            return message.reply("Sorry, only the bot owner can approve access to the private Spotify adapter.");
          }

          const storage = await this.container();
          const whitelist = (storage.data.spotifyWhitelist || (storage.data.spotifyWhitelist = []));
          const toRemove = message.mentions.users.map(u => u.id).filter(id => whitelist.includes(id));
          storage.data.spotifyWhitelist = storage.data.spotifyWhitelist.filter(id => !toRemove.includes(id));
          await storage.save();

          return message.reply(`\`\`\`md\n# Removed the following users from the whitelist:\n\n${message.mentions.users.map(u => `- ${u.username}#${u.discriminator}`).join("\n")}\n\`\`\``);
        }
        case "s-whitelist": {
          if (message.author.id !== this.clientData.owner?.id) {
            return message.reply("Sorry, only the bot owner can approve access to the private Spotify adapter.");
          }

          const storage = await this.container();
          const whitelist = (storage.data.spotifyWhitelist || (storage.data.spotifyWhitelist = []));
          const users = whitelist.map(id => this.client.users.resolve(id)).filter(user => user !== null);

          return message.reply(`\`\`\`md\n# The following users are approved to use the private Spotify adapter:\n\n${users.map(u => `- ${u!.username}#${u!.discriminator}`).join("\n")}\n\`\`\``);
        }
        case "s-link": {
          if (message.channel.type !== "dm") {
            return message.delete().then(() => message.reply("Please run this command in a DM."));
          }

          const storage = await this.container();
          const whitelist = (storage.data.spotifyWhitelist || (storage.data.spotifyWhitelist = []));
          
          if (!whitelist.includes(message.author.id)) {
            return message.reply("Sorry, you are not approved to use the private Spotify adapter.");
          }

          const [ scope, ...cookieParts ] = args;
          const cookies = cookieParts.join(" ");

          if ((await this.discordSnowflakeForScope(scope)) !== message.author.id) {
            return message.reply("Sorry, you must link your spotify status to a scope you are linked to.");
          }

          await this.service.privateSpotifyAdapter.setCookies(scope, cookies);

          message.reply(`\`\`\`md\n# Linked your Spotify account.\n\n- We linked the cookies you provided to the scope "${scope}"\n- It is highly recommended that you delete that message, as it contains credentials that anyone could use to compromise your account.\n\`\`\``);
          return;
        }
        case "s-unlink": {
          const storage = await this.container();
          const whitelist = (storage.data.spotifyWhitelist || (storage.data.spotifyWhitelist = []));
          
          if (!whitelist.includes(message.author.id)) {
            return message.reply("Sorry, you are not approved to use the private Spotify adapter.");
          }

          const [ scope ] = args;

          if ((await this.discordSnowflakeForScope(scope)) !== message.author.id) {
            return message.reply("Sorry, you must link your spotify status to a scope you are linked to.");
          }

          await this.service.privateSpotifyAdapter.setCookies(scope, undefined);

          return message.reply("Your Spotify account has been unlinked from that scope.");
        }
        case "help": {
          const commands = ["link", "unlink", "link-state", "s-link", "s-unlink", "s-link-state", "s-approve"];

          message.reply(`\`\`\`md\n# Commands\n\n${commands.map(c => `- ${this.options.prefix}${c}`).join("\n")}\n\`\`\``);
        }
      }
    });

    await ready;

    this.clientData = await this.client.fetchApplication();

    this.log.info("Connected to Discord.");

    this.state = AdapterState.RUNNING;
  }

  deferLinkLock(id: string) {
    this.linkLocks[id] = setTimeout(() => (delete this.linkLocks[id], delete this.linkLockWarns[id]), 5000);
    this.linkLockWarns[id] = this.linkLockWarns[id] || false;
  }

  async discordSnowflakeForScope(scope: string) {
    const container = await this.container();
    const snowflake = container.data.scopeBindings[scope];
    return snowflake || null;
  }

  async discordPresences(scope: string) {
    const snowflake = await this.discordSnowflakeForScope(scope);
    if (!snowflake) return [];

    return this.client.users.resolve(snowflake)?.presence.activities;
  }

  async userExcludes(scope: string) {
    const container = await this.container();
    const { excludes } = container.data;

    return excludes[scope] || [];
  }

  async activityForUser(scope: string): Promise<PresenceStruct[]> {
    const presences = await this.discordPresences(scope);
    const excludes = await this.userExcludes(scope);
    return presences?.filter(activity => !excludes.includes(activity.name))
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

  private convertActivities(snowflake: string) {
    const presences = this.client.users.resolve(snowflake)?.presence.activities;
    return presences?.map(activity => (
      new PresenceBuilder()
        .title(activity.name)
        .largeText(activity.details || activity.assets?.largeText!)
        .image((activity.assets?.largeImage || activity.assets?.smallImage) ? `https://cdn.discordapp.com/app-assets/${activity.applicationID}/${activity.assets?.largeImage || activity.assets?.smallImage}.png` : `https://cdn.discordapp.com/app-icons/${activity.applicationID}/${this.iconRegistry[activity.applicationID!].icon}.webp?size=256&keep_aspect_ratio=false`)
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
    const activities = snowflakes.reduce((acc, snowflake) => Object.assign(acc, {[snowflake]: this.convertActivities(snowflake)}), {} as Record<string, PresenceStruct[]>);

    return Object.entries(container.data.scopeBindings).reduce((acc, [scope, snowflake]) => Object.assign(acc, {[scope]: activities[snowflake]}), {} as PresenceDictionary);
  }
}