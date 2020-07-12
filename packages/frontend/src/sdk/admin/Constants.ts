export const USERS = "/api/admin/users"
export const USERS_ATTRS = `${USERS}/attributes`;
export const USERS_SEARCH = `${USERS}/search`;
export const USER_ID = (uuid: string) => `/api/admin/user/${uuid}`;
export const USER_KEY = (uuid: string) => `${USER_ID(uuid)}/key`;
export const USER_RESET_PASSWORD = (uuid: string) => `${USER_ID(uuid)}/reset-password`;