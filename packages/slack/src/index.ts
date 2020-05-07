import * as Adapters from "./adapters";
import * as Outputs from "./outputs";
import * as Entities from "./entities";

export interface RootConfig {
  clientID: string;
  clientSecret: string;
  stateSecret: string;
  signingSecret: string;
  redirectUri: string;
  linkRedirectUri: string;
}

export { Adapters, Outputs, Entities };