import { RemoteClient, RemoteClientOptions } from "@presenti/client";
import { WebLogger } from "@presenti/utils";
import store from "./store";

export const apiEndpoint = "api.presenti.me";
export const apiHost = "127.0.0.1:8138";

const options: RemoteClientOptions = {
  host: apiEndpoint,
  log: new WebLogger("RemoteClient", console),
  token: null!
};

const apiClient = new RemoteClient(options);
export default apiClient;
