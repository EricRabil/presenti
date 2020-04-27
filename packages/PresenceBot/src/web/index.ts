import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./frontend";
import PresentiAPI from "./api";

export namespace WebRoutes {
  var initialized = false;
  export function initialize(app: TemplatedApp) {
    if (initialized) return;
    const frontend = new Frontend(app);
    const api = new PresentiAPI(app);

    return { frontend, api };
  }
}