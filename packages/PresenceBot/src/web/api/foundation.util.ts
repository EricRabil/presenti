import { TemplatedApp } from "uWebSockets.js";
import RestAPIBase from "../../structs/rest-api-base";
import { RequestHandler } from "../../utils/web/types";
import { RouteData } from "../../utils/web/utils";

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

export default class PresentiAPIFoundation extends RestAPIBase {
  static prefix: string = "";
  static middleware: RequestHandler[] = [];

  constructor(app: TemplatedApp) {
    super(app);
  }

  loadRoutes() {
    this._routes = this._routes.map(metadata => {
      metadata.path = `${(this.constructor as IPresentiAPIFoundation<this>).prefix}${metadata.path}`;
      return metadata;
    })

    super.loadRoutes();
  }
  
  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(metadata, (this.constructor as IPresentiAPIFoundation<this>).middleware.concat(middleware), headers.concat('authorization', 'host'));
  }
}