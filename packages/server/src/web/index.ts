import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./routes/frontend";
import { RESTUserAPI } from "./routes/user-api";
import { RestLinkAPI } from "./routes/link-api";
import { RestTopAPI } from "./routes/api";
import { RESTTransformationsAPI } from "./routes/transformations-api";
import { RestAdminAPI } from "./routes/admin-api";

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
    const transformations = new RESTTransformationsAPI(app);
    const adminAPI = new RestAdminAPI(app);

    frontend.run();
    api.run();
    link.run();
    topAPI.run();
    transformations.run();
    adminAPI.run();

    return { frontend, api, link, topAPI };
  }
}