export namespace AuthRoutes {
    export const CREATE_USER = "/user/new";
    export const USER_AUTH = "/user/auth";
    export const USER = (uuid: string) => `/user/${uuid}`;
    export const USER_PASSWORD = (uuid: string) => `${USER(uuid)}/password`;
    export const USER_KEY = (uuid: string) => `${USER(uuid)}/key`;
    export const USER_TOKEN = (userID: string) => `${USER_AUTH}/token/${userID}`;
    export const USER_TOKEN_NEW = (userID: string) => `${USER_TOKEN(userID)}/new`;
    export const TOKENS = "/tokens";
    export const TOKENS_LOOKUP = `${TOKENS}/lookup`;
    export const FIRST_PARTY_KEY = "/first-party-key";
    export const KEYS = "/keys";
    export const KEYS_CREATE = `${KEYS}/create`;
    export const KEYS_LOOKUP = `${KEYS}/lookup`;
}