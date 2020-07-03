import { User } from "./User";
import { USER_CHANGE_PW, USER_API_KEY, USER_LOGOUT } from "../Constants";
import { isErrorResponse, RemoteClient } from "../RemoteClient";
import { ErrorResponse, PresentiUser } from "@presenti/utils/src";
import { PresentiError } from "../utils/api-error";

export interface ChangePasswordOptions {
  password: string;
  newPassword: string;
}

export class ClientUser extends User {
  constructor(client: RemoteClient, data?: PresentiUser) {
    super(client, data);
  }

  async changePassword(options: ChangePasswordOptions): Promise<ClientUser> {
    const res = await this.ajax.patch(USER_CHANGE_PW, { body: options });

    if (isErrorResponse(res)) {
      throw new PresentiError(res);
    }

    return this;
  }

  async createAPIKey(): Promise<string> {
    const res = await this.ajax.get(USER_API_KEY);

    if (isErrorResponse(res)) {
      throw new PresentiError(res);
    }

    return res.key;
  }

  async logout() {
    return this.ajax.get(USER_LOGOUT);
  }
}