import { Evented, PresenceAdapter } from "./adapter";
import { AdapterState, Presence, PayloadType, FirstPartyPresenceData, PresentiUser, OAUTH_PLATFORM, RemotePayload } from "./types";

export abstract class PresentiAPIClient extends Evented {
  adapters: PresenceAdapter[] = [];
  ready: boolean = false;

  public initialize() {
    return Promise.all(
      this.adapters.filter(adapter => (
        adapter.state === AdapterState.READY
      )).map(adapter => (
        adapter.run()
      ))
    );
  }

  /**
   * Starts the API Client
   */
  async run() {
    await this.initialize();
  }

  /**
   * Registers a PresenceAdapter to the client
   * @param adapter adapter to register
   */
  register(adapter: PresenceAdapter) {
    if (this.adapters.includes(adapter)) {
      throw new Error("Cannot register an adapter more than once.");
    }
    this.adapters.push(
      adapter.on("updated", this.sendLatestPresence.bind(this))
    );
  }


  /**
   * Sends the latest presence data to the server
   */
  sendLatestPresence() {
    return <any>Promise.all(
      this.adapters.filter(adapter => (
        adapter.state === AdapterState.RUNNING
      )).map(adapter => (
        adapter.activity()
      ))
    ).then(activities => (
      activities.filter(activity => (
        !!activity
      )).map(activity => (
        Array.isArray(activity) ? activity : [activity]
      )).reduce((a, c) => a.concat(c), [])
    )).then(activities => this.presence(activities));
  }
  
  /**
   * Sends a presence update packet
   * @param data presence data
   */
  presence(data: Presence[] = []) {
    this.emit("presence", data);
    return this.send({ type: PayloadType.PRESENCE, data });
  }
  
  /**
   * Updates the presence for a given scope. Requires first-party token.
   * Calling this endpoint without a first-party token will terminate the connection.
   * @param data presence update dto
   */
  updatePresenceForScope(data: FirstPartyPresenceData) {
    return this.send({ type: PayloadType.PRESENCE_FIRST_PARTY, data });
  }

  /**
   * Pings
   */
  ping() {
    return this.send({ type: PayloadType.PING });
  }
  
  /**
   * Query presenti for data related to a scope
   * @param userID scope/user ID
   */  abstract lookupUser(userID: string): Promise<PresentiUser | null>;

  /**
   * Query presenti for a user given a platform and the platform ID
   * @param platform platform
   * @param linkID id
   */
  abstract platformLookup(platform: OAUTH_PLATFORM, linkID: string): Promise<PresentiUser | null>;
  /**
   * Establish a link between a user and a platform
   * @param platform platform to create a link to
   * @param linkID platform ID
   * @param userID user ID
   */
  abstract linkPlatform(platform: OAUTH_PLATFORM, linkID: string, userID: string): Promise<void>;

  /**
   * Commit an action/message to Presenti
   * @param payload payload to commit
   */
  abstract send(payload: RemotePayload): void | Promise<void>;
}