import { Base } from "./Base";
import { PresentiUser, OAUTH_PLATFORM, PresentiLink, ErrorResponse, PresenceStruct, APIError } from "@presenti/utils";
import { RemoteClient, isErrorResponse } from "../RemoteClient";
import { PRESENCE_SCRAPE } from "../Constants";


export class User extends Base implements PresentiUser {
  uuid: string;
  displayName: string | null;
  userID: string;
  platforms: Record<OAUTH_PLATFORM, PresentiLink> | null;
  excludes: string[];
  attributes: PresentiUser['attributes'];

  constructor(client: RemoteClient, data?: PresentiUser) {
    super(client);

    if (data) this._patch(data);
  }

  private _patch(data: Partial<PresentiUser>) {
    this.uuid = data.uuid || this.uuid;
    this.displayName = data.displayName || this.displayName;
    this.userID = data.userID || this.userID;
    this.platforms = data.platforms || this.platforms;
    this.excludes = data.excludes || this.excludes;
    this.attributes = data.attributes || this.attributes;
  }

  /**
   * Returns the presence data for this user
   */
  async scrapePresence(): Promise<PresenceStruct[]> {
    const res = await this.ajax.get(PRESENCE_SCRAPE(this.userID));

    if (isErrorResponse(res)) {
      throw APIError.from(res);
    }

    return res.presences;
  }

  get json(): PresentiUser {
    const { uuid, displayName, userID, platforms, excludes } = this;
    
    return {
      uuid,
      displayName,
      userID,
      platforms,
      excludes,
      attributes: this.attributes
    }
  }
}