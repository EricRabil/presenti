import { RemoteClient, RemoteClientOptions } from "@presenti/client";
import store from "./store";

export const apiEndpoint = "http://api.presenti.me";

const options: RemoteClientOptions = {
  host: apiEndpoint,
  token: null!,
  fetchOptions: {
    credentials: "include"
  }
};

const apiClient = new RemoteClient(options);
export default apiClient;
