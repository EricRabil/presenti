import { Events, EventsTable, isDispatchPayload, isRemotePayload, OAuthData, OAuthQuery, OAUTH_PLATFORM, PayloadType, PipeDirection, Presence, PresentiAPIClient, PresentiLink, PresentiUser, RemotePayload } from "@presenti/utils";
import winston from "winston";

export interface RemoteClientOptions {
  /** Format of "://localhost:8138", "s://api.ericrabil.com" */
  host: string;
  token: string;
  reconnect?: boolean;
  reconnectGiveUp?: number;
  reconnectInterval?: number;
  logging?: boolean;
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
interface RequestOptions {
  params?: ParamsStruct;
  body?: BodyStruct;
}

/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
export class RemoteClient extends PresentiAPIClient {
  socket: WebSocket;
  log: winston.Logger;
  private subscriptions: Record<Events, Function[]> = {} as any;

  constructor(private options: RemoteClientOptions) {
    super();
    this.options.reconnectInterval = options.reconnectInterval || 5000;
    this.log = winston.createLogger({
      levels: {
        emerg: 0,
        alert: 1,
        crit: 2,
        error: 3,
        warn: 4,
        notice: 5,
        info: 6,
        debug: 7
      },
      transports: options.logging ? [
        new winston.transports.Console({
          level: "debug",
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ] : []
    });
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
      this.log.error(`Failed to reconnect to the server after ${this.options.reconnectGiveUp} tries.`);
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
        this.log.debug('Failed to parse server payload', {
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
          this.log.info('Connected to the server.');
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
      this.log.error(`Socket errored! ${(e as any).error?.code}`, (e as any).error?.code ? '' : e);
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
      this.log.warn(`Disconnected from the server, attempting a reconnection in ${this.options.reconnectInterval}ms`);
      setTimeout(() => this._buildSocket(), this.options.reconnectInterval);
    }
  }
  
  terminationHandler() {
    this.log.warn(`Disconnected from the server, attempting a reconnection in ${this.options.reconnectInterval}ms`);
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

  lookupLink(query: OAuthQuery): Promise<import("@presenti/utils").PresentiLink | null> {
    return this.get("/link", query);
  }

  lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<import("@presenti/utils").ResolvedPresentiLink[] | null> {
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

  resolveScopeFromUUID(uuid: string): Promise<string | null> {
    return this.get("/user/resolve", { uuid });
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
    return `http${this.options.host}`;
  }

  private get(url: string, params: ParamsStruct = {}) {
    return this.fetchJSON(url, "get", { params });
  }

  private post(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "post", opts);
  }

  private ["delete"](url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "delete", opts);
  }

  private patch(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "patch", opts);
  }

  private async fetchJSON(url: string, method: string, { params, body }: { params?: ParamsStruct, body?: BodyStruct } = {}) {
    const urlComponents = new URL(url, this.ajaxBase);
    if (params) {
      Object.entries(params).forEach(([ key, value ]) => (typeof value !== "undefined") && urlComponents.searchParams.set(key, value.toString()));
    }

    try {
      const r = await fetch(urlComponents.toString(), {
        method,
        headers: body ? {
          'Content-Type': 'application/json'
        } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
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