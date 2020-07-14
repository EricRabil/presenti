import { RestAPIBase } from "../structs/rest-api-base";
import { HTTPMethod, RequestHandler } from "./types";

export function Route(path: string = "", method: HTTPMethod = "get", ...middleware: RequestHandler[]) {
    return function<T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) {
      if (!target._routes) target._routes = [];
  
      target._routes.push({
        path,
        method,
        property,
        middleware
      });
    }
  }
  
const BuildRouteShorthand = (method: HTTPMethod) => (path?: string | RequestHandler, ...middleware: RequestHandler[]) => Route(typeof path === "string" ? path : undefined, method, ...((typeof path === "function" ? [path] : []).concat(middleware)));
export const Get = BuildRouteShorthand("get");
export const Post = BuildRouteShorthand("post");
export const Patch = BuildRouteShorthand("patch");
export const Delete = BuildRouteShorthand("del");
export const Put = BuildRouteShorthand("put");
export const Any = BuildRouteShorthand("any");
export const Options = BuildRouteShorthand("options");

/** set headers that the route will access */
export function Headers(...headers: string[]): any {
    return function (target: any, property: string, descriptor: PropertyDecorator) {
      const fn = target[property];
      fn.headers = headers;
    }
  }
  