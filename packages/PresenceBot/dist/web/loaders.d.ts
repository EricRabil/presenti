import { RequestHandler } from "../utils/web/types";
/**
 * Loads a User object into the response variable, using the identity cookie, or the authorization header if specified
 * @param includeAuth should the authorization header be used to determine identity?
 */
export declare const UserLoader: (includeAuthorization?: boolean) => RequestHandler;
