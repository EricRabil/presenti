import { APIErrorResponse, Events, EventsTable, isDispatchPayload, OAuthData, OAuthModuleDefinition, OAuthQuery, OAUTH_PLATFORM, PayloadType, PipeDirection, Presence, PresentiAPIClient, PresentiLink, PresentiUser, RemotePayload, ResolvedPresentiLink, PresenceStruct } from "@presenti/utils";
import { AJAXClient, AJAXClientOptions } from "./utils/http";
import { SocketClient, SocketClientOptions } from "./utils/socket";

export interface RemoteClientOptions extends AJAXClientOptions, SocketClientOptions {
  socket?: boolean;
}

export function isErrorResponse(obj: any): obj is APIErrorResponse {
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

  lookupUser(userID: string): Promise<PresentiUser | null> {
    return this.ajax.get("/user/lookup", { scope: userID });
  }

  lookupLink(query: OAuthQuery): Promise<PresentiLink | null> {
    return this.ajax.get("/link", query);
  }

  lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<ResolvedPresentiLink[] | null> {
    return this.ajax.get(`/link/bulk/${platform}`).then(res => res?.links || null);
  }

  lookupUserFromLink(query: OAuthQuery): Promise<PresentiUser | null> {
    return this.ajax.get("/link/user", query);
  }

  deleteLink(query: OAuthQuery): Promise<void> {
    return this.ajax.del("/link", { params: query });
  }

  createLink(data: OAuthData): Promise<PresentiLink | null> {
    return this.ajax.post("/link", { body: data });
  }

  updatePipeDirection(query: OAuthQuery, direction: PipeDirection): Promise<void> {
    const uuid = (query as { uuid: string }).uuid;
    if (!uuid) throw new Error("UUID must be provided in OAuth query.");
    return this.ajax.patch(`/link/${uuid}/pipe`, { body: { direction }});
  }
  
  scrape(scope: string): Promise<{ presences: PresenceStruct[] }> {
    return this.ajax.get(`/presence/${scope}`);
  }

  updateMyPipeDirection(pipeUUID: string, direction: PipeDirection): Promise<void> {
    return this.ajax.patch(`/user/me/pipe/${pipeUUID}`, { body: { direction }});
  }

  deleteMyPipe(pipeUUID: string): Promise<boolean> {
    return this.ajax.del(`/user/me/pipe/${pipeUUID}`).then(body => !!body.ok);
  }

  resolveScopeFromUUID(uuid: string): Promise<string | null> {
    return this.ajax.get("/user/resolve", { uuid });
  }

  whoami(): Promise<PresentiUser | APIErrorResponse> {
    return this.ajax.get("/user/me");
  }

  login(body: { id: string, password: string }): Promise<PresentiUser | APIErrorResponse> {
    return this.ajax.post("/user/auth", { body });
  }

  logout(): Promise<void> {
    return this.ajax.get("/user/logout");
  }

  signup(body: { id: string, password: string }): Promise<PresentiUser | APIErrorResponse> {
    return this.ajax.post("/user/new", { body });
  }

  createAPIKey(): Promise<string> {
    return this.ajax.get("/user/me/key").then(({ key }) => key);
  }

  changePassword(body: { password: string, newPassword: string }): Promise<{ ok: true } | APIErrorResponse> {
    return this.ajax.patch("/user/me/password", { body });
  }

  async platforms(): Promise<OAuthModuleDefinition[]> {
    const { platforms } = await this.ajax.get("/platforms");
    return platforms;
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