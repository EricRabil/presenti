import { Message, Channel, Util, ClientApplication } from "discord.js";
import RemoteClient from "@presenti/client";
import { PresentiAdditionsService } from "..";
import { OAUTH_PLATFORM } from "@presenti/utils";
import { PresencePipe } from "../db/entities/Pipe";
import { Approvals } from "../db/entities/Approvals";
import { SpotifyInternalKit } from "../adapters/utils/SpotifyInternalKit";
import { DiscordAdapter } from "../adapters";

type ChannelType = Channel['type'];
interface CommandOptions {
  type?: ChannelType | ChannelType[];
  syntax?: string;
  args?: number;
}

interface CommandData<T> {
  name: keyof T;
  options: CommandOptions;
}

function Command(name: string, options: CommandOptions = {}) {
  return function<T extends DiscordAPI>(target: T, property: keyof T, descriptor: PropertyDescriptor) {
    const commands = target.commands || (target.commands = {});
    
    commands[name] = {
      name: property,
      options
    };

    return descriptor;
  }
}

class ResponseBuilder {
  private _message: string | null = "A message from the Government of Canada";
  private _items: string[] = [];

  message(message: string | null): this {
    this._message = message;
    return this;
  }

  items(...items: string[]) {
    this._items = this._items.concat(items);
    return this;
  }

  toString() {
    if (this._items.length === 0) return this._message;

    return `\`\`\`md\n# ${this._message}\n\n${this._items.map(item => `- ${item}`).join('\n')}\n\`\`\``;
  }
}

function Response(message: string) {
  return new ResponseBuilder().message(message);
}

const oldReply = Message.prototype.reply;
Message.prototype.reply = function(...args: any[]) {
  return oldReply.call(this, ...[args[0].toString(), ...args.slice(1)]) as any;
}

export class DiscordAPI {
  commands: Record<string, CommandData<this>>;

  constructor(private discordAdapter: DiscordAdapter, private client: RemoteClient) {}

  handleMessage(message: Message, command: string) {
    const [ , ...args ] = message.content.split(" ");
    
    if (!this.commands[command]) {
      /** @todo send help? */
      console.log({command, commands: this.commands });
      return;
    }

    const { name, options } = this.commands[command];

    if (options.type) {
      const type = Array.isArray(options.type) ? options.type : [options.type];

      if (!type.includes(message.channel.type)) {
        return message.reply(Response(`Sorry, '${command}' can only be run in the following channels:`).items(...type));
      }
    }

    if (typeof options.args === "number" && args.length < options.args) {
      return message.reply(Response("Syntax Error").items(`Syntax for '${this.discordAdapter.options.discord.prefix}${command}'`, options.syntax ? `${this.discordAdapter.options.discord.prefix}${options.syntax}` : `${this.discordAdapter.options.discord.prefix}${command} ${Array.from({ length: options.args }).map((_,i) => `arg${i}`)}`));
    }
    
    if (typeof this[name] !== "function") return;
    (this[name] as unknown as Function)(message);
  }

  @Command("promote", { args: 1, syntax: "promote {...user mentions}" })
  async promoteUser(message: Message) {
    if (message.author.id !== (await this.application()).owner?.id) {
      return message.reply("Sorry, only the bot owner can promote users.");
    }

    const mentions = message.mentions.users.map(user => user.id);
    await Promise.all(mentions.map(async id => Approvals.approve(OAUTH_PLATFORM.DISCORD, id)));

    return message.reply(Response("The following users have been promoted").items(...mentions));
  }

  @Command("demote", { args: 1, syntax: "demote {...user mentions}"})
  async denyUser(message: Message) {
    if (message.author.id !== (await this.application()).owner?.id) {
      return message.reply("Sorry, only the bot owner can demote users.");
    }

    const mentions = message.mentions.users.map(user => user.id);
    await Promise.all(mentions.map(async id => Approvals.deny(OAUTH_PLATFORM.DISCORD, id)));

    return message.reply(Response("The following users have been demoted").items(...mentions));
  }

  @Command("pipe-p-spotify", { args: 1, syntax: "pipe-p-spotify {spotify cookies}"})
  async pipeSpotifyPresence(message: Message) {
    const scope = await this.loadProfileFromMessage(message);
    if (!scope) return;
    if (!(await this.assertPromoted(message))) return;
    if (message.channel.type !== "dm") {
      return (message.delete()).then(() => message.reply("Please run this command in a DM."));
    }

    const [ , ...cookieParts ] = message.content.split(" ");
    const cookies = cookieParts.join(" ");
    if (cookies.length < 1) return message.reply("Please provide a valid set of Spotify cookies.");

    await this.pipePrivateSpotify(scope.userID, cookies);

    return message.reply(Response(`Your Spotify presence will now pipe to \`${scope.userID}\``));
  }

  @Command("unpipe-p-spotify")
  async unpipeSpotifyPresence(message: Message) {
    const scope = await this.loadProfileFromMessage(message);
    if (!scope) return;
    if (!(await this.assertPromoted(message))) return;

    await this.unpipePrivateSpotify(scope.userID);

    return message.reply(Response(`Any Spotify pipe with the scope \`${scope.userID}\` has been cleared.`));
  }

  @Command("pipe-discord")
  async pipePresence(message: Message) {
    const scope = await this.loadProfileFromMessage(message);

    if (!scope) return;
    
    await this.pipeDiscord(message, scope.userID);

    return message.reply(`Your presence now pipes to \`${Util.removeMentions(scope.userID)}\`.`);
  }

  @Command("pipe-discord-state")
  async pipeState(message: Message) {
    const pipe = await this.discordPipeForMessage(message);

    if (!pipe) return message.reply("Your Discord presence does not pipe to anywhere.");

    return message.reply(Response("This is how your Discord presence is being piped").items(`Discord ID: ${message.author.id}`, `Presenti ID: ${pipe.scope}`));
  }

  @Command("unpipe-discord")
  async unpipePresence(message: Message) {
    await this.unpipeDiscord(message);

    return message.reply(`Your Discord presence no longer pipes to a scope.`);
  }

  @Command("whoami")
  async whoami(message: Message) {
    const scope = await this.loadProfileFromMessage(message);

    if (!scope) return;

    return message.reply(Response("I know everything about you.").items(`User ID: ${scope.userID}`, `UUID: ${scope.uuid}`));
  }

  @Command("ping")
  async ping(message: Message) {
    return message.reply("Pong.");
  }

  @Command("help")
  async sendHelp(message: Message) {
    return message.reply(Response("Help has arrived.").items(...Object.keys(this.commands)))
  }

  _application: ClientApplication;
  async application() {
    return this._application || (this._application = await this.discordAdapter.client.fetchApplication());
  }
  
  async loadProfileFromMessage(message: Message) {
    const scope = await this.profileForDiscordID(message.author.id);

    if (!scope) {
      message.reply("Sorry, there's no Presenti account linked to your Discord account. You can link your Discord account on the Presenti panel.");
      return null;
    }

    return scope;
  }

  async assertPromoted(message: Message) {
    const owner = message.author.id === (await this.application()).owner?.id;

    if (!(owner || await Approvals.isPromoted(OAUTH_PLATFORM.DISCORD, message.author.id))) {
      message.reply("Sorry, you are not authorized to use this command.");
      return false;
    }

    return true;
  }

  async pipePrivateSpotify(scope: string, cookies: string) {
    await this.unpipePrivateSpotify(scope);

    const pipe = PresencePipe.create({
      platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
      platformID: await SpotifyInternalKit.encryptCookies(cookies, this.discordAdapter.options.spotifyInternal),
      scope
    });
    await pipe.save();

    return pipe;
  }

  async unpipePrivateSpotify(scope: string) {
    const pipe = await PresencePipe.find({ platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL, scope });
    await Promise.all(pipe.map(p => p.remove()));
  }

  async pipeDiscord(message: Message, scope: string) {
    await this.unpipeDiscord(message);

    const pipe = PresencePipe.create({
      platform: OAUTH_PLATFORM.DISCORD,
      platformID: message.author.id,
      scope
    });
    await pipe.save();

    return pipe;
  }
  
  async unpipeDiscord(message: Message) {
    const pipe = await PresencePipe.find({ platform: OAUTH_PLATFORM.DISCORD, platformID: message.author.id });
    await Promise.all(pipe.map(p => p.remove()));
  }

  async discordPipeForMessage(message: Message) {
    return await PresencePipe.findOne({
      platform: OAUTH_PLATFORM.DISCORD,
      platformID: message.author.id
    });
  }

  profileForDiscordID(id: string) {
    return this.client.platformLookup(OAUTH_PLATFORM.DISCORD, id);
  }
  
  discordIDForScope(scope: string) {
    return this.client.lookupUser(scope).then(user => user?.platforms ? user.platforms[OAUTH_PLATFORM.DISCORD] : null);
  }
}