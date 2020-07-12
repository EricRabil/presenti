import { UserState } from ".";

const model = (state: UserState) => state.model;
const isAuthenticated = (state: UserState) => state.model !== null;
const name = (state: UserState) => state.model?.displayName || state.model?.userID;
const admin = ({ model }: UserState) => model?.attributes?.admin;

export default {
  model,
  isAuthenticated,
  name,
  admin
};
