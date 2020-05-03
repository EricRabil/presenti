import path from "path";
import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { RequestHandler, HTTPMethod } from "../utils/web/types";
import { runMiddleware, wrapResponse, wrapRequest, RouteData } from "../utils/web/utils";
import { VIEWS_DIRECTORY } from "../web/Constants";

export function Route(path: string, method: HTTPMethod, ...middleware: RequestHandler[]) {
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

const BuildRouteShorthand = (method: HTTPMethod) => (path: string, ...middleware: RequestHandler[]) => Route(path, method, ...middleware);
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

/**
 * Returns empty Route metadata
 * @param path route path
 * @param method request method
 */
export function RouteDataShell(path: string, method: HTTPMethod = "any"): RouteData {
  return {
    path,
    property: null as any,
    method,
    middleware: [] 
  }
}

/** synchronous handler for all requests - deals with use-after-free preventions and adds an onAborted handler */
function handler(exec: (res: HttpResponse, req: HttpRequest) => any, headers: string[] = []): typeof exec {
  return (res, req) => {
    res.onAborted(() => {
      if (res.stream) {
        res.stream.destroy();
      }
      res.aborted = true;
    });

    res._reqHeaders = {};
    headers.forEach(h => {
      res._reqHeaders[h] = req.getHeader(h);
    });

    res._reqUrl = req.getUrl();
    res._reqQuery = req.getQuery();
    res._method = req.getMethod();

    exec(res, req);
  }
}

function build(app: RestAPIBase, method: HTTPMethod) {
  return function(path: string, ...handlers: RequestHandler[]) {
    app[path] = handlers[handlers.length - 1];
    (app._routes || (app._routes = [])).push({
      path,
      method,
      property: path,
      middleware: handlers.slice(0, handlers.length - 1)
    });
  }
}

/** Foundation for any HTTP-based service */
export default class RestAPIBase {
  _routes: RouteData[];

  constructor(readonly app: TemplatedApp, private viewsDirectory = VIEWS_DIRECTORY, private headers: string[] = []) {
  }


  get = build(this, "get");
  post = build(this, "post");
  put = build(this, "put");
  ["delete"] = build(this, "del");
  del = build(this, "del");
  patch = build(this, "patch");
  any = build(this, "any");

  run() {
    this.loadRoutes();
  }

  /** Loads all routes registered to this instance. */
  protected loadRoutes() {
    this._routes.forEach((metadata) => {
      let { path, method, property, middleware } = metadata;
      const handler: RequestHandler = (req, res, next, eNext) => this[property](req, res, next, eNext);
      const headers = this[property].headers;
      middleware = middleware.concat(handler);
      this.app[method](path, this.buildStack(metadata, middleware, (headers || []).concat(this.headers)));
    });
  }

  /**
   * Returns a compiled middleware stack given a set of RequestHandlers.
   * 
   * Override this function to append/prepend middleware, and to modify the headers to be loaded.
   * @param middleware handler stack
   * @param headers headers to be loaded
   */
  protected buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return handler(async (res, req) => {
      const nRes = wrapResponse(res, this.resolveTemplate.bind(this)), nReq = wrapRequest(req, nRes);

      await runMiddleware(metadata, nReq, nRes, middleware);
    }, ['content-type', 'cookie'].concat(headers || []));
  }

  /**
   * Builds a handler stack that has no extra middleware.
   * 
   * @param handler handler function
   * @param headers headers to be loaded
   */
  protected buildHandler(metadata: RouteData, handler: RequestHandler, headers: string[] = []) {
    return this.buildStack(metadata, [handler], headers);
  }

  /**
   * Returns the absolute path of a template
   * 
   * Acceptable inputs:
   * login login.pug
   * @param tpl template name
   */
  private resolveTemplate(tpl: string) {
    if (!tpl.endsWith('.pug')) tpl = `${tpl}.pug`;
    return path.resolve(this.viewsDirectory, tpl);
  }
}