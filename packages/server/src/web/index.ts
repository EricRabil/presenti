import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./frontend";
import { RESTUserAPI } from "./user-api";
import { RestLinkAPI } from "./link-api";
import { BaseAPI } from "./base";
import { RESTTransformationsAPI } from "./transformations-api";
import { RestAdminAPI } from "./admin-api";

export namespace WebRoutes {
  var initialized = false;
  /**
   * Binds all API routes to the app
   * @param app uws app
   */
  export function initialize(app: TemplatedApp) {
    if (initialized) return;

    return [Frontend, RESTUserAPI, RestLinkAPI, BaseAPI, RESTTransformationsAPI, RestAdminAPI].reduce((acc, clazz) => {
      let api = new clazz(app);
      api.run();
      acc[clazz.name] = api;

      return acc;
    }, {});
  }
}