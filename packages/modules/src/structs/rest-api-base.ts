import { RequestHandler, RestAPIBase, RouteData } from "@presenti/web";
import { TemplatedApp } from "uWebSockets.js";

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
