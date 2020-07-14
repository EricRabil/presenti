import { logger } from "@presenti/logging";
import { AdapterState, OAUTH_PLATFORM, PresenceDictionary, PresenceList, PresentiAPIClient, PipeDirection, Events, PresentiAPI } from "@presenti/utils";
import { SpotifyInternalKit } from "./utils/SpotifyInternalKit";
import { SpotifyPrivateClient } from "./utils/SpotifyPrivateClient";
import { ScopedPresenceAdapter } from "@presenti/modules";

/**
 * Presence binding for sactivity
 */
export class PrivateSpotifyAdapter extends ScopedPresenceAdapter {
  static configKey: string = "spotifyInternal";
  log = logger.child({ name: "PrivateSpotify" })

  constructor(private presenti: PresentiAPI) {
    super();
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
    const cookies = await SpotifyInternalKit.decryptCookies(encryptedCookies);

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