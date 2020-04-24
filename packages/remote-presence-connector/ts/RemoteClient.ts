import { Presence, PresenceAdapter, AdapterState, Evented } from "remote-presence-utils";
import { isRemotePayload, PayloadType, RemotePayload } from "remote-presence-utils";

export interface RemoteClientOptions {
  url: string;
  token: string;
  reconnect?: boolean;
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

  constructor(private options: RemoteClientOptions) {
    super();
    this.socket = new WebSocket(options.url);
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
  run() {
    this.initialize().then(() => this._buildSocket());
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

    if (this._retryCounter > 5) {
      throw new Error('Failed to reconnect to the server after five tries.');
    }

    this.socket = new WebSocket(this.options.url);

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
          console.log('Connected to the server.');
          break;
        // on pong, schedule the next ping
        case PayloadType.PONG:
          this.deferredPing();
          break;
      }
    }

    // run reconnect loop unless we were force-killed or options specify no reconnect
    this.socket.onclose = () => {
      this.emit("close");
      if ((this.options.reconnect === false) || this._killed) return;
      console.log('Disconnected from the server, attempting a reconnection in 5000ms');
      setTimeout(() => this._buildSocket(), 5000);
    }
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
  presence(data: Presence[]) {
    this.emit("presence", data);
    return this.send({ type: PayloadType.PRESENCE, data });
  }

  /**
   * Sends a packet to the server
   * @param payload data
   */
  send(payload: RemotePayload) {
    this.socket.send(JSON.stringify(payload));
  }
}