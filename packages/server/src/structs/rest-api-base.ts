import { PBRestAPIBase } from "@presenti/modules";
import { TemplatedApp } from "uWebSockets.js";
import { VIEWS_DIRECTORY } from "../Constants";

/** Base class for API endpoints */
export default class _PBRestAPIBase extends PBRestAPIBase {
  constructor(app: TemplatedApp, headers: string[] = []) {
    super(app, headers);
    this.viewsDirectory = VIEWS_DIRECTORY;
  }
}