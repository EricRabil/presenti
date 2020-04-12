import { Presence, PresenceAdapter, AdapterState } from "remote-presence-utils";
import { isRemotePayload, PayloadType, RemotePayload } from "remote-presence-utils";

// nodejs, try cws, fallback to ws

if (global) {
  let wsLib;
  try {
    wsLib = require('@clusterws/cws').WebSocket;
  } catch {
    wsLib = require('ws');
  }
  (global as any).WebSocket = wsLib;
} 

export interface RemoteClientOptions {
  url: string;
  token: string;
}

/**
 * Connects to a PresenceServer and allows you to funnel presence updates through it
 */
export class RemoteClient {
  socket: WebSocket;
  ready: boolean = false;
  adapters: PresenceAdapter[] = [];

  constructor(private options: RemoteClientOptions) {
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

  run() {
    this.initialize().then(() => this._buildSocket());
  }

  register(adapter: PresenceAdapter) {
    if (this.adapters.includes(adapter)) {
      throw new Error("Cannot register an adapter more than once.");
    }
    this.adapters.push(
      adapter.on("presence", this.sendLatestPresence.bind(this))
    );
  }

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
  
  private _retryCounter: number = 0;
  private _buildSocket() {
    this._retryCounter++;

    if (this._retryCounter > 5) {
      throw new Error('Failed to reconnect to the server after five tries.');
    }

    this.socket = new WebSocket(this.options.url);

    this.socket.onopen = () => {
      this.send({
        type: PayloadType.IDENTIFY,
        data: this.options.token
      });
    }

    this.socket.onmessage = ({ data }) => {
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
        case PayloadType.GREETINGS:
          this.ready = true;
          this._retryCounter = 0;
          this.deferredPing();
          break;
        case PayloadType.PONG:
          this.deferredPing();
          break;
      }
    }

    this.socket.onclose = () => {
      console.debug('Disconnected from the server, attempting a reconnection in 5000ms');
      setTimeout(() => this._buildSocket());
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