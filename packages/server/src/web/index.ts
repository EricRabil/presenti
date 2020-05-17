import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./routes/frontend";
import { RESTUserAPI } from "./routes/user-api";
import { RestLinkAPI } from "./routes/link-api";
import { RestTopAPI } from "./routes/api";

export namespace WebRoutes {
  var initialized = false;
  /**
   * Binds all API routes to the app
   * @param app uws app
   */
  export function initialize(app: TemplatedApp) {
    if (initialized) return;
    const frontend = new Frontend(app);
    const api = new RESTUserAPI(app);
    const link = new RestLinkAPI(app);
    const topAPI = new RestTopAPI(app);

    frontend.run();
    api.run();
    link.run();
    topAPI.run();

    return { frontend, api, link, topAPI };
  }
}