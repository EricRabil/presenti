import log from "@presenti/logging";
import { FirstPartyPresenceData, isFirstPartyPresencePayload, isPresencePayload, OAuthData, OAuthQuery, PayloadType, PipeDirection, PresentiAPIClient, PresentiLink, PresentiUser, RemotePayload, OAUTH_PLATFORM, ResolvedPresentiLink } from "@presenti/utils";
import { APIError } from "@presenti/web";
import { OAuthAPI } from "../api/oauth";
import { UserAPI } from "../api/user";
import { EventBus } from "../event-bus";

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
    const user = await UserAPI.queryUser({ userID }, true);
    if (user instanceof APIError) return null;
    return user as PresentiUser;
  }
  
  async lookupLink(query: OAuthQuery): Promise<PresentiLink | null> {
    const link = await OAuthAPI.lookupLink(query);
    if (link instanceof APIError) return null;
    return link;
  }

  async lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<ResolvedPresentiLink[] | null> {
    const links = await OAuthAPI.lookupLinksForPlatform(platform);
    if (links instanceof APIError) return null;
    return links;
  }

  async lookupUserFromLink(query: OAuthQuery): Promise<PresentiUser | null> {
    const link = await OAuthAPI.lookupUser(query, true);
    if (link instanceof APIError) return null;
    return link;
  }

  async deleteLink(query: OAuthQuery): Promise<void> {
    await OAuthAPI.deleteLink(query, true);
  }

  async createLink(data: OAuthData): Promise<PresentiLink | null> {
    const link = await OAuthAPI.createLink(data);
    if (link instanceof APIError) return null;
    return link;
  }

  async updatePipeDirection(query: OAuthQuery, direction: PipeDirection): Promise<void> {
    await OAuthAPI.updatePipeDirection(query, direction);
  }

  async resolveScopeFromUUID(uuid: string): Promise<string | null> {
    const scope = await UserAPI.resolveScopeFromUUID(uuid);
    return scope instanceof APIError ? null : scope;
  }

  subscribe(event, listener) {
    EventBus.on(event, listener);
  }

  unsubscribe(event, listener) {
    EventBus.off(event, listener);
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