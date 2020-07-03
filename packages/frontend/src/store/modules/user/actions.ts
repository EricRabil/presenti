import { Store, ActionContext } from "vuex";
import apiClient from "@/api";
import { isErrorResponse } from "@presenti/client";
import { UserState } from ".";
import { OAUTH_PLATFORM } from "@presenti/utils";
import platforms from "../platforms";

const getUser = async (context: ActionContext<any, any>) => {
  const me = await apiClient.whoami().then((r) => isErrorResponse(r) ? null : r).catch(() => null);

  context.commit("update", me);
  return me;
};

const logout = async (context: ActionContext<UserState, any>) => {
  await apiClient.logout();
  context.commit("update", null);
};

const unlink = async (context: ActionContext<UserState, any>, platform: OAUTH_PLATFORM) => {
  const linkData = context.state.model?.platforms?.[platform];
  if (!linkData) { return; }

  const success = await apiClient.deleteMyPipe(linkData.uuid);
  if (success) { context.commit("removePlatform", platform); }
};

export default {
  getUser,
  logout,
  unlink
};
