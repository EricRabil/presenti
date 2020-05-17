import { UserState } from ".";

const model = (state: UserState) => state.model;
const isAuthenticated = (state: UserState) => state.model !== null;
const name = (state: UserState) => state.model?.displayName || state.model?.userID;

export default {
  model,
  isAuthenticated,
  name
};
