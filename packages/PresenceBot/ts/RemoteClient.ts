import { Presence } from "./adapter";
import { RemotePayload, PayloadType } from "./adapters/RemoteAdapter";
import { isRemotePayload } from "./adapters/RemoteAdapter";
import WebSocket from "ws";

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

  constructor(private options: RemoteClientOptions) {
    this.socket = new WebSocket(options.url);
  }

  run() {
    this._buildSocket();
  }
  
  private _retryCounter: number = 0;
  private _buildSocket() {
    this._retryCounter++;

    if (this._retryCounter > 5) {
      throw new Error('Failed to reconnect to the server after five tries.');
    }

    this.socket = new WebSocket(this.options.url);

    this.socket.onopen = () => {
      this.ping();
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
    return new Promise((res, rej) => this.socket.send(JSON.stringify(payload), e => e ? rej(e) : res()));
  }
}