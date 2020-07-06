import { PresentiUser } from "@presenti/utils";
import { APIError } from "@presenti/web";
import { User } from "../database/entities";
import { removeEmptyFields } from "../utils/object";
import { MALFORMED_BODY } from "../Constants";
import { FindConditions } from "typeorm";
import { ObjectCache } from "../structs/object-cache";

type UUIDQuery = { uuid: string };
type UserIDQuery = { userID: string };

export type UserQuery = UUIDQuery | UserIDQuery | (UUIDQuery & UserIDQuery);

export namespace UserAPI {
  const validKeys: keyof User = ["uuid", "userID"] as any;

  const resolvedScopes = new ObjectCache<string>("scopes");

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
    if (!isValidQuery(query)) return MALFORMED_BODY;
    
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
    var scope: string | null = null;

    if (!(await resolvedScopes.exists(uuid))) {
      scope = await User.createQueryBuilder("user")
        .select(["user.userID"])
        .where("uuid = :uuid", { uuid })
        .getRawOne()
        .then(fields => fields?.user_userID);

      if (scope) await resolvedScopes.set(uuid, scope);
    } else {
      scope = await resolvedScopes.get(uuid);
    }

    if (!scope) return APIError.notFound("Unknown user.");

    return scope;
  }

  export async function resolveUUIDFromScope(scope: string): Promise<string | APIError> {
    const uuid = await User.createQueryBuilder("user")
                            .select(["user.uuid"])
                            .where("user.userID = :userID", { userID: scope })
                            .getRawOne()
                            .then(fields => fields?.user_uuid);
    
    if (!uuid) return APIError.notFound("Unknown user.");

    return uuid;
  }
}