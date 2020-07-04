import { RemoteClient, RemoteClientOptions } from "@presenti/client";
import { WebLogger } from "@presenti/utils";
import store from "./store";

export const apiEndpoint = process.env.VUE_APP_API_ENDPOINT;
export const apiHost = apiEndpoint;

const options: RemoteClientOptions = {
  host: apiEndpoint,
  log: new WebLogger("RemoteClient", console),
  token: null!
};

const apiClient = new RemoteClient(options);
export default apiClient;
