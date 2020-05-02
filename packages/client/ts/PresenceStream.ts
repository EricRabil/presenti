import { Evented, PresenceStruct, PayloadType } from "@presenti/utils";

export interface PresenceStreamOptions {
  url?: string;
  reconnectInterval?: number;
}

export declare interface PresenceStream {
  on(event: "presence", listener: (data: PresenceStruct[]) => any): this;
  on(event: "state", listener: (state: Record<string, any>) => any): this;
  on(event: string, listener: Function): this;

  emit(event: "presence", presence: PresenceStruct[]): boolean;
  emit(event: "state", state: Record<string, any>): boolean;
  emit(event: string, ...args: any[]): boolean;
}

export class PresenceStream extends Evented {
  static readonly DEFAULT_URL = "wss://api.ericrabil.com/presence/";
  static readonly DEFAULT_RECONNECT = 5000;
  socket: WebSocket | null = null;

  constructor(private scope: string, private options: PresenceStreamOptions = {}) {
    super();
    if (!options.url) options.url = PresenceStream.DEFAULT_URL;
    if (typeof options.reconnectInterval !== "number") options.reconnectInterval = PresenceStream.DEFAULT_RECONNECT;
  }

  private _killed = false;
  close() {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) return;
    this._killed = true;
    this.socket.close();
  }
  
  connect() {
    if (this.socket) this.close();

    this._killed = false;
    this.socket = new WebSocket(this.url);
    this.socket.onmessage = ({ data }) => {
      const payload = JSON.parse(data);
      switch (payload.type) {
        case PayloadType.PONG:
          setTimeout(() => this.ping(), 30 * 1000);
          break;
        default:
          const { presence, state } = JSON.parse(data);
          this.emit("presence", presence);
          this.emit("state", state);
      }
    }

    this.socket.onclose = () => {
      if (this._killed) return;
      if (this.options.reconnectInterval === 0) return;
      console.debug(`Socket disconnected from the server. Reconnecting in ${this.options.reconnectInterval}ms`);
      setTimeout(() => this.connect(), this.options.reconnectInterval);
    }
    
    this.socket.onopen = () => (console.log('Connected to the Presenti API'), this.ping());
  }

  ping() {
    this.socket?.send(JSON.stringify({ type: PayloadType.PING }));
  }

  get url() {
    return `${this.options.url}${this.scope}`;
  }
}