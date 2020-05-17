import { APIErrorResponse, Events, EventsTable, isDispatchPayload, isRemotePayload, OAuthData, OAuthQuery, OAUTH_PLATFORM, PayloadType, PipeDirection, Presence, PresentiAPIClient, PresentiLink, PresentiUser, RemotePayload, ResolvedPresentiLink, OAuthModuleDefinition } from "@presenti/utils";

export interface RemoteClientOptions {
  /** Format of "://localhost:8138", "s://api.ericrabil.com" */
  host: string;
  token: string;
  reconnect?: boolean;
  reconnectGiveUp?: number;
  reconnectInterval?: number;
  logging?: boolean;
  fetchOptions?: RequestOptions;
}

export declare interface RemoteClient {
  on(event: "presence", listener: (presence: Presence[]) => any): this;
  on(event: "close", listener: () => any): this;
  on(event: "ready", listener: () => any): this;
  on(event: string, listener: Function): this;

  emit(event: "presence", presence: Presence[]): boolean;
  emit(event: "close"): boolean;
  emit(event: "ready"): boolean;
  emit(event: string, ...args: any[]): boolean;
}

type ParamsStruct = Record<string, string | number | boolean | any>;
type BodyStruct = object;
interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: ParamsStruct;
  body?: BodyStruct;
}

export interface ErrorResponse {
  error: string;
  code: number;
}

export function isErrorResponse(obj: any): obj is ErrorResponse {
  return typeof obj === "object"
      && typeof obj.error === "string"
      && typeof obj.code === "number";
}

/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
export class RemoteClient extends PresentiAPIClient {
  socket: WebSocket;
  private subscriptions: Record<Events, Function[]> = {} as any;

  constructor(private options: RemoteClientOptions) {
    super();
    this.options.reconnectInterval = options.reconnectInterval || 5000;
  }

  /**
   * Starts the RemoteClient
   */
  async run() {
    await super.run();
    return this._buildSocket();
  }

  /**
   * Closes the connection
   */
  close() {
    this._killed = true;
    this.socket.close();
  }

  private _retryCounter: number = 0;
  private _killed: boolean = false;
  private _buildSocket() {
    this._retryCounter++;
    this._killed = false;
    this.ready = false;

    if (this.options.reconnect && this._retryCounter > this.options.reconnectGiveUp!) {
      console.error(`Failed to reconnect to the server after ${this.options.reconnectGiveUp} tries.`);
      return;
    }

    this.socket = new WebSocket(`ws${this.options.host}/remote`);

    // authentication on socket open
    this.socket.onopen = () => {
      this.send({
        type: PayloadType.IDENTIFY,
        data: this.options.token
      });
    }

    // message handling
    this.socket.onmessage = (data) => {
      data = typeof data === "string" ? data : data.data;
      var payload;
      try {
        payload = JSON.parse(data.toString());
      } catch (e) {
        console.debug('Failed to parse server payload', {
          e,
          data
        });
        return;
      }
      if (!isRemotePayload(payload)) return;
      switch (payload.type) {
        // authentication successful, begin operations
        case PayloadType.GREETINGS:
          this.ready = true;
          this.emit("ready");
          this._retryCounter = 0;
          this.deferredPing();
          console.info('Connected to the server.');
          break;
        // on pong, schedule the next ping
        case PayloadType.PONG:
          this.deferredPing();
          break;
        case PayloadType.DISPATCH:
          if (isDispatchPayload(payload)) {
            const event = payload.data.event as Events, data = payload.data.data;
            if (!this.subscriptions[event]) break;
            this.subscriptions[event].forEach(fn => fn(data));
          }
          break;
      }
    }

    let dealtWith = false;
    this.socket.onerror = e => {
      console.error(`Socket errored! ${(e as any).error?.code}`, (e as any).error?.code ? '' : e);
      if (!dealtWith) {
        dealtWith = true;
        this.terminationHandler();
      }
    }

    // run reconnect loop unless we were force-killed or options specify no reconnect
    this.socket.onclose = () => {
      this.emit("close");
      if (dealtWith) return;
      dealtWith = true;
      if ((this.options.reconnect === false) || this._killed) return;
      console.warn(`Disconnected from the server, attempting a reconnection in ${this.options.reconnectInterval}ms`);
      setTimeout(() => this._buildSocket(), this.options.reconnectInterval);
    }
  }
  
  terminationHandler() {
    console.warn(`Disconnected from the server, attempting a reconnection in ${this.options.reconnectInterval}ms`);
    setTimeout(() => this._buildSocket(), this.options.reconnectInterval);
  }

  /**
   * Pings after 30 seconds
   */
  deferredPing() {
    setTimeout(() => this.ping(), 1000 * 30);
  }

  lookupUser(userID: string): Promise<PresentiUser | null> {
    return this.get("/user/lookup", { scope: userID });
  }

  lookupLink(query: OAuthQuery): Promise<PresentiLink | null> {
    return this.get("/link", query);
  }

  lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<ResolvedPresentiLink[] | null> {
    return this.get(`/link/bulk/${platform}`).then(res => res?.links || null);
  }

  lookupUserFromLink(query: OAuthQuery): Promise<PresentiUser | null> {
    return this.get("/link/user", query);
  }

  deleteLink(query: OAuthQuery): Promise<void> {
    return this.delete("/link", { params: query });
  }

  createLink(data: OAuthData): Promise<PresentiLink | null> {
    return this.post("/link", { body: data });
  }

  updatePipeDirection(query: OAuthQuery, direction: PipeDirection): Promise<void> {
    const uuid = (query as { uuid: string }).uuid;
    if (!uuid) throw new Error("UUID must be provided in OAuth query.");
    return this.patch(`/link/${uuid}/pipe`, { body: { direction }});
  }

  updateMyPipeDirection(pipeUUID: string, direction: PipeDirection): Promise<void> {
    return this.patch(`/user/me/pipe/${pipeUUID}`, { body: { direction }});
  }

  deleteMyPipe(pipeUUID: string): Promise<boolean> {
    return this.delete(`/user/me/pipe/${pipeUUID}`).then(body => !!body.ok);
  }

  resolveScopeFromUUID(uuid: string): Promise<string | null> {
    return this.get("/user/resolve", { uuid });
  }

  whoami(): Promise<PresentiUser | ErrorResponse> {
    return this.get("/user/me");
  }

  login(body: { id: string, password: string }): Promise<PresentiUser | ErrorResponse> {
    return this.post("/user/auth", { body });
  }

  logout(): Promise<void> {
    return this.get("/user/logout");
  }

  signup(body: { id: string, password: string }): Promise<PresentiUser | ErrorResponse> {
    return this.post("/user/new", { body });
  }

  createAPIKey(): Promise<string> {
    return this.get("/user/me/key").then(({ key }) => key);
  }

  changePassword(body: { password: string, newPassword: string }): Promise<{ ok: true } | APIErrorResponse> {
    return this.patch("/user/me/password", { body });
  }

  async platforms(): Promise<OAuthModuleDefinition[]> {
    const { platforms } = await this.get("/platforms");
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

  get headers() {
    return {
      authorization: this.options.token
    }
  }

  get socketEndpoint() {
    return `ws${this.options.host}/remote`;
  }

  get ajaxBase() {
    return this.options.host;
  }

  get(url: string, params: ParamsStruct = {}) {
    return this.fetchJSON(url, "get", { params });
  }

  post(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "post", opts);
  }

  ["delete"](url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "delete", opts);
  }

  patch(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "patch", opts);
  }

  async fetchJSON(url: string, method: string, { params, body, ...options }: RequestOptions = {}) {
    method = method.toUpperCase();
    const urlComponents = new URL(`${url.startsWith('/api') ? '' : '/api'}${url.startsWith('/') ? '' : '/'}${url}`, this.ajaxBase);
    if (params) {
      Object.entries(params).forEach(([ key, value ]) => (typeof value !== "undefined") && urlComponents.searchParams.set(key, value.toString()));
    }
    
    const fetchOptions = {
      method,
      headers: body ? {
        'Content-Type': 'application/json',
        ...this.headers
      } : this.headers,
      body: body ? JSON.stringify(body) : undefined,
      ...(this.options.fetchOptions || {}) as any,
      ...options
    };

    console.log({ fetchOptions, options: this.options });

    try {
      const r = await fetch(urlComponents.toString(), fetchOptions);
      return await r.json();
    } catch {
      return null;
    }
  }

  /**
   * Sends a packet to the server
   * @param payload data
   */
  send(payload: RemotePayload) {
    this.socket.send(JSON.stringify(payload));
  }
}