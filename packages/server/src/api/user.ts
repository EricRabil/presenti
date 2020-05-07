import { PresentiUser } from "@presenti/utils";
import { APIError } from "@presenti/web";
import { User } from "../database/entities";

export namespace UserAPI {
  /**
   * Lookup a user given their userID (scope)
   * @param userID user name / scope
   * @param full return full object model?
   * @param queryingUser userID of the user querying for the model
   */
  export async function lookupUser(userID: string, full: boolean = false, queryingUser: string | null = null): Promise<PresentiUser | APIError> {
    const user = await User.findOne({ userID });
    if (!user) {
      return APIError.notFound("Unknown user.");
    }
    
    return user.json(full || (user.userID === queryingUser));
  }

  export async function resolveScopeFromUUID(uuid: string): Promise<string | APIError> {
    const scope = await User.createQueryBuilder("user")
                            .select(["user.userID"])
                            .where("uuid = :uuid", { uuid })
                            .getRawOne()
                            .then(fields => fields?.user_userID);

    if (!scope) return APIError.notFound("Unknown user.");

    return scope;
  }
}