import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./frontend";
import PresentiAPI from "./api/api";
import PresentiOAuthAPI from "./api/oauth-api";

export namespace WebRoutes {
  var initialized = false;
  /**
   * Binds all API routes to the app
   * @param app uws app
   */
  export function initialize(app: TemplatedApp) {
    if (initialized) return;
    const frontend = new Frontend(app);
    const api = new PresentiAPI(app);
    const oauthAPI = new PresentiOAuthAPI(app);

    frontend.run();
    api.run();
    oauthAPI.run();

    return { frontend, api, oauthAPI };
  }
}