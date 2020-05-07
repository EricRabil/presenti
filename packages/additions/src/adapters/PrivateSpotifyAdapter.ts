import { log } from "@presenti/logging";
import { AdapterState, OAUTH_PLATFORM, PresenceDictionary, PresenceList, PresentiAPIClient, PipeDirection, Events } from "@presenti/utils";
import { PresentiAdditionsConfig } from "../structs/config";
import { StorageAdapter } from "../structs/StorageAdapter";
import { SpotifyInternalKit } from "./utils/SpotifyInternalKit";
import { SpotifyPrivateClient } from "./utils/SpotifyPrivateClient";

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
  static configKey: string = "spotifyInternal";
  log = log.child({ name: "PrivateSpotify" })

  constructor(private config: PresentiAdditionsConfig, private presenti: PresentiAPIClient) {
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
    this.presenti.subscribe(Events.LINK_CREATE, async link => {
      if (link.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
      if (link.pipeDirection !== PipeDirection.PRESENTI && link.pipeDirection !== PipeDirection.BIDIRECTIONAL) return;
      const scope = await this.presenti.resolveScopeFromUUID(link.userUUID);
      if (!scope) return;

      this.deregisterScope(scope);
      this.registerScope(scope, link.platformID);
    });

    this.presenti.subscribe(Events.LINK_UPDATE, async link => {
      if (link.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
      const scope = await this.presenti.resolveScopeFromUUID(link.userUUID);
      if (!scope) return;

      this.deregisterScope(scope);
      if (link.pipeDirection === PipeDirection.PRESENTI || link.pipeDirection === PipeDirection.BIDIRECTIONAL) this.registerScope(scope, link.platformID);
    });

    this.presenti.subscribe(Events.LINK_REMOVE, async link => {
      if (link.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
      const scope = await this.presenti.resolveScopeFromUUID(link.userUUID);
      console.log(scope);
      if (!scope) return;

      this.deregisterScope(scope);
    });

    await this.reloadClients();

    this.state = AdapterState.RUNNING;
  }

  async reloadClients() {
    let pipes = await this.presenti.lookupLinksForPlatform(OAUTH_PLATFORM.SPOTIFY_INTERNAL);
    if (!pipes) return;
    pipes = pipes.filter(pipe => pipe.pipeDirection === PipeDirection.BIDIRECTIONAL || pipe.pipeDirection === PipeDirection.PRESENTI);

    await Promise.all(pipes.map(({ scope, platformID: cookies }) => this.registerScope(scope, cookies)));
  }

  async registerScope(scope: string, encryptedCookies: string) {
    const cookies = await SpotifyInternalKit.decryptCookies(encryptedCookies, this.config.spotifyInternal);

    this.log.info(`Registering Spotify connection with scope ${scope}`);
    const client = new SpotifyPrivateClient(cookies);
    client.on("updated", () => {
      this.log.info(`Spotify scope ${scope} had a track update`);

      this.emit("updated", scope);
    });
    
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