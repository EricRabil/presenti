import { StorageAdapter } from "../structs/StorageAdapter";
import { PresenceList, PresenceDictionary } from "presenti/dist/utils/presence-magic";
import { SpotifyPrivateClient } from "./utils/SpotifyPrivateClient";
import { AdapterState, OAUTH_PLATFORM } from "remote-presence-utils";
import { PresencePipe } from "../db/entities/Pipe";
import { EventBus, Events } from "../event-bus";
import { SpotifyInternalKit } from "./utils/SpotifyInternalKit";

interface SpotifyStorage {
  /** Format of Record<scope, headers> */
  scopeBindings: {
    [scope: string]: string;
  };
}

const DEFAULT_STORAGE: SpotifyStorage = {
  scopeBindings: {}
}

/**
 * Presence binding for sactivity
 */
export class PrivateSpotifyAdapter extends StorageAdapter<SpotifyStorage> {
  constructor() {
    super("com.ericrabil.spotify.private", DEFAULT_STORAGE);
  }

  clients: Record<string, SpotifyPrivateClient> = {};

  async activityForUser(id: string): Promise<PresenceList> {
    const { [id]: client } = this.clients;
    if (!client) return [];
    
    return [await client.activity()].filter(a => typeof a !== "undefined") as PresenceList;
  }

  async activities(): Promise<PresenceDictionary> {
    const activities = await Promise.all(
      Object.entries(this.clients).map(async ([scope, client]) => ({ scope, presences: await client.activity() }))
    );

    return activities.reduce((acc, { scope, presences }) => Object.assign(acc, { [scope]: presences }),{});
  }

  async run(): Promise<void> {
    EventBus.on(Events.PIPE_CREATE, pipe => {
      if (pipe.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
      this.registerScope(pipe.scope, pipe.platformID);
    });

    EventBus.on(Events.PIPE_DESTROY, pipe => {
      if (pipe.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
      this.deregisterScope(pipe.scope);
      this.emit("updated", pipe.scope);
    });

    await this.reloadClients();

    this.state = AdapterState.RUNNING;
  }

  async reloadClients() {
    const pipes = await PresencePipe.find({
      platform: OAUTH_PLATFORM.SPOTIFY_INTERNAL
    });

    await Promise.all(pipes.map(({ scope, platformID: cookies }) => this.registerScope(scope, cookies)));
  }

  async registerScope(scope: string, encryptedCookies: string) {
    const cookies = await SpotifyInternalKit.decryptCookies(encryptedCookies);

    const client = new SpotifyPrivateClient(cookies);
    client.on("updated", () => this.emit("updated", scope));
    
    this.clients[scope] = client;

    return client.run();
  }

  deregisterScope(scope: string) {
    const client = this.clients[scope];
    if (!client) return;

    client.close();
    delete this.clients[scope];
    this.emit("updated", scope);
  }
}