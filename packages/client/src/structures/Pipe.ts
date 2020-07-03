import { Base } from "./Base";
import { PresentiLink, OAUTH_PLATFORM, PipeDirection } from "@presenti/utils/src";
import { RemoteClient, isErrorResponse } from "../RemoteClient";
import { PRESENCE_PIPE, USER_PIPE_MANAGE, OAUTH_LINK, OAUTH_RESOLVE } from "../Constants";
import { PresentiError } from "../utils/api-error";
import { User } from "./User";

export class Pipe extends Base implements PresentiLink {
  uuid: string;
  platform: OAUTH_PLATFORM;
  platformID: string;
  userUUID: string;
  pipeDirection: PipeDirection;

  constructor(client: RemoteClient, data: PresentiLink) {
    super(client);

    this._patch(data);
  }

  private _patch({ uuid, platform, platformID, userUUID, pipeDirection }: Partial<PresentiLink>): Pipe {
    this.uuid = uuid || this.uuid;
    this.platform = platform || this.platform;
    this.platformID = platformID || this.platformID;
    this.userUUID = userUUID || this.userUUID;
    this.pipeDirection = typeof pipeDirection === "number" ? pipeDirection : this.pipeDirection;

    return this;
  }

  /**
   * Deletes the pipe
   */
  async delete(): Promise<void> {
    const res = this.clientUserOwnsPipe ? await this.ajax.delete(USER_PIPE_MANAGE(this.uuid)) : await this.ajax.delete(OAUTH_LINK, { params: {
      uuid: this.uuid
    }});

    if (isErrorResponse(res)) {
      throw new PresentiError(res);
    }

    return;
  }

  /**
   * Updates the direction of this pipe
   * @param direction direction to switch to
   */
  async setDirection(direction: PipeDirection): Promise<Pipe> {
    const result = await this.ajax.patch((this.clientUserOwnsPipe ? USER_PIPE_MANAGE : PRESENCE_PIPE)(this.uuid), { body: { direction }});
    
    if (isErrorResponse(result)) {
      throw new PresentiError(result);
    }

    return this._patch(result);
  }

  /**
   * Resolves the user associated with this pipe
   */
  async user(): Promise<User> {
    return new User(this.client, await this.ajax.get(OAUTH_RESOLVE, { params: { uuid: this.uuid }}));
  }

  /**
   * Whether or not this pipe is tied to the client user
   */
  private get clientUserOwnsPipe() {
    return this.client.user?.uuid === this.userUUID;
  }
}