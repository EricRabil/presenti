import { BaseClientOptions, BaseClient } from "./base-client";
import { RemotePayload, isRemotePayload, PayloadType } from "@presenti/utils";

export interface SocketClientOptions extends BaseClientOptions {
  token?: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  pingInterval?: number;
}

export declare interface SocketClient {
  on(event: "payload", listener: (payload: RemotePayload) => any): this;
  on(event: "close", listener: () => any): this;
  on(event: "ready", listener: () => any): this;
  on(event: "open", listener: () => any): this;
  on(event: string, listener: Function): this;
}

export class SocketClient extends BaseClient<SocketClientOptions> {
  public socket: WebSocket;

  private retryCounter: number = 0;
  private killed: boolean = false;
  private _ready: boolean = false;

  constructor(options: SocketClientOptions) {
    super(options);
  }

  /**
   * Sends a packet to the server
   * @param payload data
   */
  send(payload: RemotePayload) {
    if (!this.connected) return this.queue(payload);
    if (this.options.trace) this.options.trace("to", JSON.stringify(payload, undefined, 4));
    this.socket.send(JSON.stringify(payload));
  }

  /**
   * Closes the connection without a scheduled reconnection
   */
  close() {
    this.killed = true;
    this.socket.close();
  }

  /**
   * Sends a ping payload
   */
  ping() {
    this.send({ type: PayloadType.PING });
  }

  connect(path: string) {
    if (this.connected) this.close();

    this.buildSocket(this.url(path));
  }

  /**
   * Queues a payload to be sent upon connection to the server
   * @param payload payload to be sent
   */
  protected queue(payload: RemotePayload) {
    if (payload.type === PayloadType.PING) return;
  }

  /**
   * Schedules a ping packet to be sent after the configured interval
   */
  protected deferredPing() {
    setTimeout(() => this.ping(), this.pingInterval);
  }

  /**
   * Connects to socket API at the given endpoint
   * @param url API endpoint to connect to
   */
  protected buildSocket(url: string) {
    this.retryCounter++;
    this.killed = false;
    this.ready = false;

    /** exceeded reconnect interval */
    if (this.options.reconnect && this.retryCounter > this.reconnectAttempts) {
      this.log.error(`Failed to reconnect to the server after ${this.reconnectAttempts} tries.`);
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => this.emit("open");
    
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

      this.log.debug('Received payload from server', { payload });

      switch (payload.type) {
        case PayloadType.GREETINGS:
          this.ready = true;
        case PayloadType.PONG:
          this.deferredPing();
        default:
          this.emit("payload", payload);
          if (this.options.trace) this.options.trace("from", JSON.stringify(payload, undefined, 4));
      }
    }

    var caught = false;
    const onclose = () => {
      this.log.info(`Socket connection to ${url} did close`);
      this.emit("close");

      /** reconnect logic */
      if (this.continueReconnecting) {
        this.log.debug(`Scheduling a reconnection in ${this.reconnectInterval}ms`);
        setTimeout(() => this.buildSocket(url), this.reconnectInterval);
      }
    }

    this.socket.onerror = e => {
      caught = true;
      this.log.error(`Socket connection to ${url} failed with error`, e);
      onclose();
    }

    this.socket.onclose = () => {
      if (caught) return;
      onclose();
    };
  }

  url(path: string) {
    const url = new URL(path, this.baseURL);
    return url.toString();
  }

  get connected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get baseURL() {
    return `${this.secure ? 'wss' : 'ws'}://${this.host}`;
  }

  get continueReconnecting() {
    if (this.killed) return false;
    if (this.retryCounter > this.reconnectAttempts) return false;
    this.retryCounter++;
    return true;
  }

  get reconnectAttempts() {
    return typeof this.options.reconnectAttempts === "number" ? this.options.reconnectAttempts : 5;
  }

  set reconnectAttempts(attempts) {
    this.options.reconnectAttempts = attempts;
  }

  get reconnectInterval() {
    return typeof this.options.reconnectInterval === "number" ? this.options.reconnectInterval : 5000;
  }

  set reconnectInterval(interval) {
    this.options.reconnectInterval = interval;
  }

  get ready() {
    return this._ready;
  }

  set ready(ready) {
    this._ready = ready;
    if (ready) {
      this.emit("ready");
      this.retryCounter = 0;
    }
  }

  get pingInterval() {
    return typeof this.options.pingInterval === "number" ? this.options.pingInterval : 30000;
  }

  set pingInterval(pingInterval) {
    this.options.pingInterval = pingInterval;
  }
}