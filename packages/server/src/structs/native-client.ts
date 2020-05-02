import { RemoteClient } from "@presenti/client";
import { RemotePayload, PayloadType, isFirstPartyPresencePayload, FirstPartyPresenceData, OAUTH_PLATFORM, PresentiUser, isPresencePayload } from "@presenti/utils";
import PresentiAPI from "../web/api/api";
import { APIError } from "../utils/web/utils";
import log from "../utils/logging";

export declare interface NativeClient extends RemoteClient {
  on(event: "updated", fn: (data: FirstPartyPresenceData) => any): this;
  on(event: string | symbol, fn: any): this;
  emit(event: "updated", data: FirstPartyPresenceData): boolean;
  emit(event: string | symbol, ...data: any[]): boolean;
}

/**
 * Subclass of RemoteClient for adapters running within the server process, makes no network calls
 * Everything is treated as a first-party
 */
export class NativeClient extends RemoteClient {
  log = log.child({ name: "NativeClient" })

  constructor(private scope: string | null = null) {
    super({} as any);
  }

  async run() {
    await super.initialize();
  }

  terminationHandler() {}
  close() {}
  ping() {}
  deferredPing() {}

  async lookupUser(userID: string): Promise<PresentiUser | null> {
    const user = await PresentiAPI.userQuery(userID, true);
    if (user instanceof APIError) return null;
    return user;
  }

  async platformLookup(platform: OAUTH_PLATFORM, linkID: string): Promise<PresentiUser | null> {
    const user = await PresentiAPI.platformLookup(platform, linkID, true);
    if (user instanceof APIError) return null;
    return user;
  }

  get headers() {
    return null as any;
  }

  get socketEndpoint() {
    return null as any;
  }

  get ajaxBase() {
    return null as any;
  }

  send(payload: RemotePayload) {
    switch (payload.type) {
      case PayloadType.PRESENCE:
        if (isPresencePayload(payload) && this.scope) {
          this.emit("updated", { scope: this.scope, presence: payload.data })
        } else {
          this.log.warn("Illegal call to third-party presence update");
        }
        break;
      case PayloadType.PRESENCE_FIRST_PARTY:
        if (isFirstPartyPresencePayload(payload) && !this.scope) {
          this.emit("updated", payload.data);
        } else {
          this.log.warn("Illegal call to first-party presence update");
        }
        break;
    }
  }
}

export default NativeClient;