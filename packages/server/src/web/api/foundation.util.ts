import { TemplatedApp } from "uWebSockets.js";
import { RequestHandler, RestAPIBase, RouteData } from "@presenti/web";
import { VIEWS_DIRECTORY } from "../Constants";

interface IPresentiAPIFoundation<T> {
  new(...args: any[]): T;
  prefix: string;
  middleware: RequestHandler[];
}

export function API(prefix: string) {
  return function<Ctor extends IPresentiAPIFoundation<any>>(target: Ctor): Ctor {
    target.prefix = prefix;
    return target;
  }
}

export function GlobalGuards(...middleware: RequestHandler[]) {
  return function<Ctor extends IPresentiAPIFoundation<any>>(target: Ctor): Ctor {
    target.middleware = middleware;
    return target;
  }
}

/** Base class for API endpoints */
export default class PBRestAPIBase extends RestAPIBase {
  /** prefix for the API routes encapsulated within the class */
  static prefix: string = "";
  /** middleware to be injected into all API routes */
  static middleware: RequestHandler[] = [];

  constructor(app: TemplatedApp, headers: string[] = []) {
    super(app, VIEWS_DIRECTORY, headers);
  }

  loadRoutes() {
    /** Prepends all routes with the prefixed path */
    this._routes = this._routes.map(metadata => {
      metadata.path = `${(this.constructor as IPresentiAPIFoundation<this>).prefix}${metadata.path}`;
      return metadata;
    })

    super.loadRoutes();
  }
  
  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    /** Prepends all middleware with the configured middleware */
    return super.buildStack(metadata, (this.constructor as IPresentiAPIFoundation<this>).middleware.concat(middleware), headers.concat('authorization', 'host'));
  }
}