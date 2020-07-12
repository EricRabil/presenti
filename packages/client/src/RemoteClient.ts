import { ErrorResponse, Events, EventsTable, isDispatchPayload, OAuthData, OAuthModuleDefinition, OAuthQuery, OAUTH_PLATFORM, PayloadType, PipeDirection, Presence, PresentiAPIClient, PresentiLink, PresentiUser, RemotePayload, ResolvedPresentiLink, PresenceStruct, PresenceTransformationRecord, TransformationModelCreateOptions, TransformationModelUpdateOptions, SuccessResponse, APIError } from "@presenti/utils";
import { AJAXClient, AJAXClientOptions } from "./utils/http";
import { SocketClient, SocketClientOptions } from "./utils/socket";
import { USER_LOOKUP, OAUTH_LINK, OAUTH_LINK_BULK, OAUTH_RESOLVE, PRESENCE_PIPE, PRESENCE_SCRAPE, USER_PIPE_MANAGE, USER_RESOLVE, USER_ME, USER_AUTH, USER_LOGOUT, USER_SIGNUP, USER_API_KEY, USER_CHANGE_PW, PLATFORMS, TRANSFORMATIONS, TRANSFORMATION_ID } from "./Constants";
import { Transformation } from "./structures/Transformation";
import { ClientStore } from "./stores/ClientStore";
import { ClientUser } from "./structures/ClientUser";
import { User } from "./structures/User";
import { Pipe } from "./structures/Pipe";

export interface RemoteClientOptions extends AJAXClientOptions, SocketClientOptions {
  socket?: boolean;
}

export function isErrorResponse(obj: any): obj is ErrorResponse {
  return typeof obj === "object"
      && typeof obj.error === "string"
      && typeof obj.code === "number";
}

/**
 * Interacts with the REST API and allows presence data to be funnelled through it
 */
export class RemoteClient extends PresentiAPIClient {
  ajax: AJAXClient;
  socket: SocketClient;
  store: ClientStore = new ClientStore();
  user: ClientUser;
  
  private subscriptions: Record<Events, Function[]> = {} as any;

  constructor(private options: RemoteClientOptions) {
    super();
    this.options.reconnectInterval = options.reconnectInterval || 5000;
    this.ajax = new AJAXClient(this.options);
    this.socket = new SocketClient(this.options);

    this.socket.on("open", () => {
      this.socket.send({
        type: PayloadType.IDENTIFY,
        data: this.options.token
      });
    });

    this.socket.on("payload", payload => {
      switch (payload.type) {
        case PayloadType.DISPATCH:
          if (isDispatchPayload(payload)) {
            const event = payload.data.event as Events, data = payload.data.data;
            if (!this.subscriptions[event]) break;
            this.subscriptions[event].forEach(fn => fn(data));
          }
          break;
      }
    });
  }

  /**
   * Starts the RemoteClient
   */
  async run() {
    await super.run();
    if (this.socket) this.socket.connect("/remote");
  }

  async close() {
    if (this.socket) this.socket.close();
  }

  /**
   * Looks up the user with the given user ID
   * @param userID the ID of the user to lookup
   */
  async lookupUser(userID: string): Promise<User | null> {
    const result = await this.ajax.get(USER_LOOKUP, { params: { scope: userID } });

    if (isErrorResponse(result)) {
      if (result.code === 404) return null;
      throw APIError.from(result);
    }

    return new User(this, result);
  }

  async lookupLink(query: OAuthQuery): Promise<Pipe | null> {
    const result = await this.ajax.get(OAUTH_LINK, { params: query });

    if (isErrorResponse(result)) {
      if (result.code === 404) return null;
      throw APIError.from(result);
    }

    return new Pipe(this, result);
  }

  async lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<ResolvedPresentiLink[] | null> {
    const body = await this.ajax.get(OAUTH_LINK_BULK(platform));
    return body?.links || null;
  }

  async lookupUserFromLink(query: OAuthQuery): Promise<User | null> {
    const result = await this.ajax.get(OAUTH_RESOLVE, { params: query });

    if (isErrorResponse(result)) {
      if (result.code === 404) return null;
      throw APIError.from(result);
    }

    return new User(this, result);
  }

  deleteLink(query: OAuthQuery): Promise<void> {
    return this.ajax.del(OAUTH_LINK, { params: query });
  }

  async createLink(data: OAuthData): Promise<Pipe | null> {
    const result = await this.ajax.post(OAUTH_LINK, { body: data });

    if (isErrorResponse(result)) {
      if (result.code === 404) return null;
      throw APIError.from(result);
    }

    return new Pipe(this, result);
  }

  updatePipeDirection(query: OAuthQuery, direction: PipeDirection): Promise<void> {
    const uuid = (query as { uuid: string }).uuid;
    if (!uuid) throw new Error("UUID must be provided in OAuth query.");
    return this.ajax.patch(PRESENCE_PIPE(uuid), { body: { direction }});
  }
  
  scrape(scope: string): Promise<{ presences: PresenceStruct[] }> {
    return this.ajax.get(PRESENCE_SCRAPE(scope));
  }

  updateMyPipeDirection(pipeUUID: string, direction: PipeDirection): Promise<void> {
    return this.ajax.patch(USER_PIPE_MANAGE(pipeUUID), { body: { direction }});
  }

  async deleteMyPipe(pipeUUID: string): Promise<boolean> {
    const body = await this.ajax.del(USER_PIPE_MANAGE(pipeUUID));
    return !!body.ok;
  }

  resolveScopeFromUUID(uuid: string): Promise<string | null> {
    return this.ajax.get(USER_RESOLVE, { params: { uuid } });
  }

  async whoami(): Promise<ClientUser | null> {
    if (this.user) return this.user;

    const result = await this.ajax.get(USER_ME);

    if (isErrorResponse(result)) {
      if (result.code === 404) return null;
      throw APIError.from(result);
    }

    return this.user = new ClientUser(this, result);
  }

  async login(body: { id: string, password: string }): Promise<PresentiUser> {
    const result = await this.ajax.post(USER_AUTH, { body });

    if (isErrorResponse(result)) throw APIError.from(result);

    return this.user = new ClientUser(this, result);
  }

  async logout(): Promise<void> {
    return (await this.whoami())?.logout() as any;
  }

  async signup(body: { id: string, email: string, displayName: string, password: string }): Promise<ClientUser> {
    const result = await this.ajax.post(USER_SIGNUP, { body });

    if (isErrorResponse(result)) throw APIError.from(result);

    return this.user = new ClientUser(this, result);
  }

  async createAPIKey(): Promise<string> {
    return (await this.whoami())!.createAPIKey();
  }

  async changePassword(body: { password: string, newPassword: string }): Promise<void> {
    (await this.whoami())?.changePassword(body);
  }

  async transformations() {
    const transformations: PresenceTransformationRecord[] | ErrorResponse = await this.ajax.get(TRANSFORMATIONS);
    if (isErrorResponse(transformations)) throw transformations;

    return transformations.map(transformation => new Transformation(this, transformation));
  }

  async createTransformation(options: TransformationModelCreateOptions): Promise<Transformation> {
    const res = await this.ajax.post(TRANSFORMATIONS, { body: options });
    if (isErrorResponse(res)) throw res;

    return new Transformation(this, res);
  }

  async platforms() {
    const { platforms } = await this.ajax.get(PLATFORMS);
    
    return this.store.setPlatforms(platforms);
  }

  subscribe<T extends Events>(event: T, listener: (data: EventsTable[T]) => any): void {
    (this.subscriptions[event] || (this.subscriptions[event] = [])).push(listener);
    this.send({ type: PayloadType.SUBSCRIBE, data: { event }});
  }

  unsubscribe<T extends Events>(event: T, listener: (data: EventsTable[T]) => any): void {
    if (!this.subscriptions[event]) return;

    const idx = this.subscriptions[event].indexOf(listener);
    if (idx > -1) {
      this.subscriptions[event].splice(this.subscriptions[event].indexOf(listener), 1);
    }

    this.send({ type: PayloadType.UNSUBSCRIBE, data: { event }});
  }

  /**
   * Sends a packet to the server
   * @param payload data
   */
  send(payload: RemotePayload) {
    this.socket.send(payload);
  }
}