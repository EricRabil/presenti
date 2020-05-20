import { isPresencePayload, PayloadType, PresenceStruct, RemotePayload } from "@presenti/utils";
import { SocketClient, SocketClientOptions } from "./utils/socket";

export declare interface PresenceStream extends SocketClient {
  on(event: "presence", listener: (data: PresenceStruct[]) => any): this;
  on(event: "state", listener: (state: Record<string, any>) => any): this;
  on(event: string, listener: Function): this;

  emit(event: "presence", presence: PresenceStruct[]): boolean;
  emit(event: "state", state: Record<string, any>): boolean;
  emit(event: string, ...args: any[]): boolean;
}

export class PresenceStream extends SocketClient {
  static readonly DEFAULT_HOST = "api.ericrabil.com";

  constructor(private scope: string, options: SocketClientOptions = { host: PresenceStream.DEFAULT_HOST }) {
    super(options);

    this.on("payload", (payload: RemotePayload) => {
      switch (payload.type) {
        case PayloadType.PRESENCE:
          if (!isPresencePayload(payload)) return;
          this.emit("presence", payload.data.presence);
          this.emit("state", payload.data.state);
          break;
      }
    });
  }
  
  connect() {
    super.connect(`/presence/${this.scope}`);
  }
}