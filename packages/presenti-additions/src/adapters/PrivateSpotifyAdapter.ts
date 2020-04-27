import { StorageAdapter } from "../structs/StorageAdapter";
import { PresenceList, PresenceDictionary } from "presenti/dist/utils/presence-magic";
import { SpotifyPrivateClient } from "./utils/SpotifyPrivateClient";
import { AdapterState } from "remote-presence-utils";

const scdn = (tag: string) => `https://i.scdn.co/image/${tag}`

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
    const container = await this.container();
    await Promise.all(
      Object.entries(container.data.scopeBindings)
            .map(([scope, cookies]) => this.registerScope(scope, cookies))
    );

    this.state = AdapterState.RUNNING;
  }

  async setCookies(scope: string, cookies: string | undefined) {
    const container = await this.container();
    const oldCookies = container.data.scopeBindings[scope];
    if (oldCookies === cookies) return;

    this.deregisterScope(scope);

    if (cookies) {
      container.data.scopeBindings[scope] = cookies;
      this.registerScope(scope, cookies);
    } else {
      delete container.data.scopeBindings[scope];
      this.emit("updated", scope);
    }

    await container.save();
  }

  registerScope(scope: string, cookies: string) {
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
  }
}