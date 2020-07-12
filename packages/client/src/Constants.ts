import { OAUTH_PLATFORM } from "@presenti/utils";

/** instance metadata */
export const PLATFORMS =                                       "/platforms";
/** remote sessions */
export const SESSION =                                         "/session";
export const SESSION_SCOPED =               (scope: string) => `/session/${scope}`;
export const REMOTE_SOCKET =                                   "/remote";
/** oauth management */
export const PRESENCE_PIPE =             (linkUUID: string) => `/link/${linkUUID}/pipe`;
export const OAUTH_LINK =                                      "/link";
export const OAUTH_LINK_BULK =   (platform: OAUTH_PLATFORM) => `/link/bulk/${platform}`;
export const OAUTH_RESOLVE =                                   "/link/user";
/** user resolution */
export const USER_LOOKUP =                                     "/user/lookup";
export const USER_RESOLVE =                                    "/user/resolve";
/** authentication */
export const USER_AUTH =                                       "/user/auth";
export const USER_LOGOUT =                                     "/user/logout";
export const USER_SIGNUP =                                     "/user/new";
/** /user/me */
export const USER_ME =                                         "/user/me";
export const USER_CHANGE_PW =                                  "/user/me/password";
export const USER_API_KEY =                                    "/user/me/key";
export const USER_PIPE_MANAGE =          (pipeUUID: string) => `/user/me/pipe/${pipeUUID}`;
/** /presence */
export const PRESENCE_SCRAPE =              (scope: string) => `/presence/${scope}`;
/** /transformations */
export const TRANSFORMATIONS =                                 "/transformations";
export const TRANSFORMATION_ID =             (uuid: string) => `/transformations/${uuid}`;