import { RemoteClient, RemoteClientOptions } from "@presenti/client";
import { WebLogger, APIError } from "@presenti/utils";
import store from "./store";

export const apiEndpoint = process.env.VUE_APP_API_ENDPOINT;
export const apiHost = apiEndpoint;
export const GENERIC_ERROR = APIError.from({ error: "An error occurred while processing your request. Please try again in a little while.", code: -1 })

const options: RemoteClientOptions = {
  host: apiEndpoint,
  log: new WebLogger("RemoteClient", console),
  token: null!
};

const apiClient = new RemoteClient(options);
export default apiClient;
