import { PresenceAdapter, AdapterState } from "../adapter";
import { Client, Activity } from "discord.js";

export interface DiscordAdapterOptions {
  token: string;
  user: string;
  overrides: string[];
}

export class DiscordAdapter extends PresenceAdapter {
  client: Client;

  constructor(public readonly options: DiscordAdapterOptions) {
    super();
  }

  state: AdapterState = AdapterState.READY;

  async run(): Promise<void> {
    this.client = new Client();

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

  async activity() {
    return this.user?.presence.activities.filter(activity => !this.options.overrides.includes(activity.name));
  }
}