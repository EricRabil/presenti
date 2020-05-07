import { Evented, PresenceAdapter } from "./adapter";
import { AdapterState, Presence, PayloadType, FirstPartyPresenceData, PresentiUser, OAUTH_PLATFORM, RemotePayload, PresentiLink, PipeDirection, OAuthQuery, OAuthData, ResolvedPresentiLink, Events, EventsTable } from "./types";

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
   */
  abstract lookupUser(userID: string): Promise<PresentiUser | null>;
  /**
   * Lookup the link data associated with an OAuth identity
   * @param query query used to lookup the link
   */
  abstract lookupLink(query: OAuthQuery): Promise<PresentiLink | null>;
  /**
   * Lookup the links for the given platform
   * @param platform platform to pull links for
   */
  abstract lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<ResolvedPresentiLink[] | null>;
  /**
   * Lookup the user associated with an OAuth identity
   * @param query query used to lookup the link
   */
  abstract lookupUserFromLink(query: OAuthQuery): Promise<PresentiUser | null>;
  /**
   * Deletes a connection between an OAuth identity and a Presenti user
   * @param query query used to lookup the link
   */
  abstract deleteLink(query: OAuthQuery): Promise<void>;
  /**
   * Establishes a connection between an OAuth identity and a Presenti user
   * @param data data defining the link
   */
  abstract createLink(data: OAuthData): Promise<PresentiLink | null>;
  /**
   * Updates the pipe direction for an oauth profile
   * @param query data associated with an oauth profile
   * @param direction 
   */
  abstract updatePipeDirection(query: OAuthQuery, direction: PipeDirection): Promise<void>;
  /**
   * Resolves the scope of a user given the UUID
   * @param uuid user UUID
   */
  abstract resolveScopeFromUUID(uuid: string): Promise<string | null>;
  /**
   * Subscribe to a Presenti event
   * @param event event code
   * @param listener event handler
   */
  abstract subscribe<T extends Events>(event: T, listener: (data: EventsTable[T]) => any): void;
  /**
   * Unsubscribe from a Presenti event
   * @param event event code
   * @param listener event handler
   */
  abstract unsubscribe<T extends Events>(event: T, listener: (data: EventsTable[T]) => any): void;
  /**
   * Commit an action/message to Presenti
   * @param payload payload to commit
   */
  abstract send(payload: RemotePayload): void | Promise<void>;
}