import { PresentiAPIClient } from "@presenti/utils";
import { RemotePayload, PayloadType, isFirstPartyPresencePayload, FirstPartyPresenceData, OAUTH_PLATFORM, PresentiUser, isPresencePayload } from "@presenti/utils";
import PresentiAPI from "../web/api/api";
import { APIError } from "@presenti/web";
import log from "@presenti/logging";

export declare interface NativeClient extends PresentiAPIClient {
  on(event: "updated", fn: (data: FirstPartyPresenceData) => any): this;
  on(event: string | symbol, fn: any): this;
  emit(event: "updated", data: FirstPartyPresenceData): boolean;
  emit(event: string | symbol, ...data: any[]): boolean;
}

/**
 * API that interfaces directly with the Presenti systems
 */
export class NativeClient extends PresentiAPIClient {
  log = log.child({ name: "NativeClient" })

  constructor(private scope: string | null = null) {
    super();
  }

  async run() {
    await super.initialize();
  }

  async lookupUser(userID: string): Promise<PresentiUser | null> {
    const user = await PresentiAPI.userQuery(userID, true);
    if (user instanceof APIError) return null;
    return user as PresentiUser;
  }

  async platformLookup(platform: OAUTH_PLATFORM, linkID: string): Promise<PresentiUser | null> {
    const user = await PresentiAPI.platformLookup(platform, linkID, true);
    if (user instanceof APIError) return null;
    return user as PresentiUser;
  }

  async linkPlatform(platform: OAUTH_PLATFORM, linkID: string, userID: string) {
    const result = await PresentiAPI.linkPlatform(platform, linkID, userID);
    if (result instanceof APIError) throw result;
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