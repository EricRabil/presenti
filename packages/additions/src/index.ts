import { RemoteClient, RemoteClientOptions } from "@presenti/client";
import { AdapterSupervisor } from "@presenti/server";
import { PresenceList } from "@presenti/server/dist/utils/presence-magic";
import inquirer from "inquirer";
import { DiscordAdapter } from "./adapters/DiscordAdapter";
import { PrivateSpotifyAdapter } from "./adapters/PrivateSpotifyAdapter";
import { CONFIG, saveConfig } from "./Configuration";
import { Database } from "./db/connector";

export class PresentiAdditionsService {
  client: RemoteClient;
  supervisor: AdapterSupervisor;
  database: Database = new Database();
  presences: Record<string, PresenceList> = {};
  privateSpotifyAdapter: PrivateSpotifyAdapter;
  discordAdapter: DiscordAdapter;

  async run() {
    await this.ensureConfig();
    await this.database.connect();

    this.client = new RemoteClient(this.config as RemoteClientOptions);
    await this.client.run();

    var readyHandler: Function;
    await new Promise(resolve => {
      this.client.on("ready", readyHandler = async () => {
        this.client.off("ready", readyHandler);
        await this.initializeAdapters();
        resolve();
      });
    });
  }

  async initializeAdapters() {
    this.supervisor = new AdapterSupervisor();
    this.supervisor.on("updated", scope => this.updateAndDispatch(scope!));

    this.supervisor.register(this.privateSpotifyAdapter = new PrivateSpotifyAdapter(CONFIG as any));
    if (CONFIG.discord) this.supervisor.register(this.discordAdapter = new DiscordAdapter(CONFIG as any, this.client));

    await this.supervisor.run();
  }

  async dispatch(scope: string) {
    if (!scope) return;
    const presence = this.presences[scope] || {};
    if (!presence) return;

    this.client.updatePresenceForScope({
      presence,
      scope
    });
  }

  async updateAndDispatch(scope: string) {
    this.presences[scope] = await this.supervisor.scopedData(scope);
    this.dispatch(scope);
  }

  get connected() {
    return this.client.ready;
  }

  async ensureConfig() {
    let changed = false;
    if (!this.config.host) {
      this.config.host = await inquirer.prompt([
        {
          type: "input",
          name: "host",
          message: "What is the presenti host?",
          default: "://127.0.0.1:8138"
        }
      ]).then(p => p.host);
      changed = true;
    }

    if (!this.config.token) {
      this.config.token = await inquirer.prompt([
        {
          type: "input",
          name: "token",
          message: "What is your first-party presenti token?"
        }
      ]).then(p => p.token);
      changed = true;
    }

    if (changed) {
      await saveConfig();
    }
  }

  get config() {
    return CONFIG.presenti;
  }
}

export * as Adapters from "./adapters";
export * as Entities from "./db/entities";

