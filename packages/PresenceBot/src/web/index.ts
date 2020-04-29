import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./frontend";
import PresentiAPI from "./api/api";
import PresentiOAuthAPI from "./api/oauth-api";

export namespace WebRoutes {
  var initialized = false;
  export function initialize(app: TemplatedApp) {
    if (initialized) return;
    const frontend = new Frontend(app);
    const api = new PresentiAPI(app);
    const oauthAPI = new PresentiOAuthAPI(app);

    return { frontend, api, oauthAPI };
  }
}