import { OAUTH_PLATFORM, PresentiUser, OAuthQuery, PipeDirection, PresentiLink, ResolvedPresentiLink, OAuthData } from "@presenti/utils";
import { OAuthLink } from "../database/entities/OAuthLink";
import { APIError } from "@presenti/web";
import { User } from "../database/entities";
import { UserAPI } from "./user";
import logger from "@presenti/logging";
import { removeEmptyFields } from "../utils/object";
import { MALFORMED_BODY } from "../Constants";

export namespace OAuthAPI {
  const log = logger.child({ name: "OAuthAPI" });
  const UNKNOWN_LINK = APIError.notFound("Unknown link.");
  const LEGAL_KEYS = ["platform", "pipeDirection", "platformID", "userUUID", "uuid"];

  function isValidOAuthQuery(query: any): query is OAuthQuery {
    const keys = Object.keys(query);
    if (keys.length === 0) return false;
    return keys.every(key => LEGAL_KEYS.includes(key));
  }

  /**
   * Updates the pipe configuration for an OAuth link profile
   * @param query data used to lookup the profile to be modified
   * @param pipeDirection the pipe direction to set on the link
   */
  export async function updatePipeDirection(query: OAuthQuery, pipeDirection: PipeDirection) {
    const link = await queryLink(query);
    if (link instanceof APIError) return link;

    link.pipeDirection = pipeDirection;

    await link.save();

    return link;
  }

  /**
   * Lookup the link data given a query
   * @param query query to lookup the link with
   */
  export async function lookupLink(query: OAuthQuery): Promise<PresentiLink | APIError> {
    const link = await queryLink(query);
    if (link instanceof APIError) return link;

    return link.json;
  }

  /**
   * Returns links for the given platform
   * @param platform platform to query for
   */
  export async function lookupLinksForPlatform(platform: OAUTH_PLATFORM): Promise<ResolvedPresentiLink[]> {
    return Promise.all(await OAuthLink.createQueryBuilder("link")
                    .leftJoinAndSelect("link.user", "user")
                    .where("platform = :platform", { platform })
                    .getMany()
                    .then(res => res.map(link => link.resolvedJson())));
  }

  /**
   * Lookup the user associated to an oauth profile
   * @param query query to lookup the link with
   * @param full whether to return the full user data
   */
  export async function lookupUser(query: OAuthQuery, full: boolean = false) {
    const link = await queryLink(query);
    if (link instanceof APIError) return link;

    const user = await User.findOne({ uuid: link.userUUID });

    return user?.json(full) || APIError.notFound("Unknown user.");
  }

  /**
   * Deletes a link in the database
   * @param query query to use when deleting the link
   * @param silent whether this should be performed silently or if not found errors should bubble
   */
  export async function deleteLink(query: OAuthQuery, silent: boolean = false) {
    const link = await queryLink(query);
    if (link instanceof OAuthLink) {
      await link.remove();
    } else if (!silent && link instanceof APIError) {
      return link;
    }

    return { ok: true };
  }

  /**
   * Creates a platformID/userID association in the database
   * @param platform platform
   * @param platformID platform ID
   * @param userUUID user UUID
   */
  export async function createLink({ platform, platformID, userUUID, pipeDirection }: OAuthData): Promise<PresentiLink | APIError> {
    if (!platform || !platformID) return APIError.badRequest("The platform and link id are required.");
    if (!OAUTH_PLATFORM[platform]) return APIError.notFound("Unknown platform.");
    
    log.debug(`Creating OAuth link between [${platform}:${platformID}] <-> [PRESENTI:${userUUID}]`)

    const link = OAuthLink.create({ platform, platformID, user: { uuid: userUUID }, pipeDirection });
    await link.save();

    return link.json;
  }

  /**
   * Look up an OAuth link given a query
   * @param query query to use when looking up the link
   */
  async function queryLink(query: OAuthQuery) {
    query = removeEmptyFields(query) as any;
    if (!isValidOAuthQuery(query)) return MALFORMED_BODY;

    const link = await OAuthLink.findOne(query);
    if (!link) return UNKNOWN_LINK;

    return link;
  }
}