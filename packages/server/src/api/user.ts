import { PresentiUser } from "@presenti/utils";
import { APIError } from "@presenti/web";
import { User } from "../database/entities";
import { removeEmptyFields } from "../utils/object";

type UUIDQuery = { uuid: string };
type UserIDQuery = { userID: string };

export type UserQuery = UUIDQuery | UserIDQuery | (UUIDQuery & UserIDQuery);

export namespace UserAPI {
  const validKeys: keyof User = ["uuid", "userID"] as any;

  function isValidQuery(query: any): query is UserQuery {
    const keys = Object.keys(query);
    if (keys.length === 0) return false;
    return keys.every(key => validKeys.includes(key));
  }

  /**
   * Lookup a user given a set of query data
   * @param query query data
   * @param full whether to return the full contents
   */
  export async function queryUser(query: UserQuery, full: boolean = false) {
    query = removeEmptyFields(query) as any;
    if (!isValidQuery(query)) return APIError.badRequest("Malformed body.");
    
    /**
     * @optimization findOne() currently selects all columns *twice*, which can double server load in certain circumstances.
     */
    const user = await User.find(query);
    
    if (!user || user.length !== 1) {
      return APIError.notFound("Unknown user.");
    }

    return user[0].json(full);
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