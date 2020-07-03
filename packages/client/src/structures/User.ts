import { Base } from "./Base";
import { PresentiUser, OAUTH_PLATFORM, PresentiLink, ErrorResponse, PresenceStruct } from "@presenti/utils/src";
import { RemoteClient, isErrorResponse } from "../RemoteClient";
import { PRESENCE_SCRAPE } from "../Constants";
import { PresentiError } from "../utils/api-error";


export class User extends Base implements PresentiUser {
  uuid: string;
  displayName: string | null;
  userID: string;
  platforms: Record<OAUTH_PLATFORM, PresentiLink> | null;
  excludes: string[];

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
  }

  /**
   * Returns the presence data for this user
   */
  async scrapePresence(): Promise<PresenceStruct[]> {
    const res = await this.ajax.get(PRESENCE_SCRAPE(this.userID));

    if (isErrorResponse(res)) {
      throw new PresentiError(res);
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
      excludes
    }
  }
}