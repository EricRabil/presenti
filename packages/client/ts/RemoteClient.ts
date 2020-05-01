import { Presence, PresenceAdapter, AdapterState, Evented, PresentiUser, OAUTH_PLATFORM } from "remote-presence-utils";
import { isRemotePayload, PayloadType, RemotePayload, FirstPartyPresenceData, API_ROUTES } from "remote-presence-utils";
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

/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
export class RemoteClient extends Evented {
  socket: WebSocket;
  ready: boolean = false;
  adapters: PresenceAdapter[] = [];
  log: winston.Logger;

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

  private initialize() {
    return Promise.all(
      this.adapters.filter(adapter => (
        adapter.state === AdapterState.READY
      )).map(adapter => (
        adapter.run()
      ))
    );
  }

  /**
   * Starts the RemoteClient
   */
  async run() {
    await this.initialize();
    return this._buildSocket();
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

  /**
   * Pings
   */
  ping() {
    return this.send({ type: PayloadType.PING });
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
   * Query presenti for data related to a scope
   * @param userID scope/user ID
   */
  async lookupUser(userID: string): Promise<PresentiUser | null> {
    return fetch(`${this.ajaxBase}/api/users/${userID}`, { headers: this.headers }).then(r => r.json()).catch(e => null);
  }

  /**
   * Query presenti for a user given a platform and the platform ID
   * @param platform platform
   * @param linkID id
   */
  async platformLookup(platform: OAUTH_PLATFORM, linkID: string): Promise<PresentiUser | null> {
    const params = new URLSearchParams();
    params.set('platform', platform);
    params.set('id', linkID);

    return fetch(`${this.ajaxBase}/api/users/lookup?${params.toString()}`, { headers: this.headers }).then(r => r.json()).catch(e => null);
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

  /**
   * Sends a packet to the server
   * @param payload data
   */
  send(payload: RemotePayload) {
    this.socket.send(JSON.stringify(payload));
  }
}