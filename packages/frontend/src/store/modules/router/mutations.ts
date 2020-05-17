import { RouterState } from ".";

const updateLoginRedirect = (state: RouterState, redirect: string | null) => {
  state.loginRedirect = redirect;
};

export default {
  updateLoginRedirect
};
