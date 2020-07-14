import path from "path";
import * as uuid from "uuid";
import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { RequestHandler, HTTPMethod, PBRequest, PBResponse, RouteData } from "../utils/types";
import logger from "@presenti/logging";
import { PresenceServer } from "@presenti/utils";
import { ServerLoader } from "../loaders";
import { CORSMiddleware } from "../utils";
import runMiddleware from "../utils/middleware-runner";
import extendResponse from "../utils/extensions/response";
import extendRequest from "../utils/extensions/request";

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

interface IPresentiAPIFoundation<T> {
  new(...args: any[]): T;
  prefix: string;
  middleware: RequestHandler[];
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

/** builds a handler generator for the given method */
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

const log = logger.child({ name: "@presenti/web" })

export namespace SharedPresentiWebController {
  export var server: PresenceServer;
}

/** Foundation for any HTTP-based service */
export class RestAPIBase {
  /** prefix for the API routes encapsulated within the class */
  static prefix: string = "";
  /** middleware to be injected into all API routes */
  static middleware: RequestHandler[] = [];

  _routes: RouteData[];
  protected timedExecution: boolean = process.env.NODE_ENV !== "development";

  protected viewsDirectory: string = process.cwd();

  constructor(readonly app: TemplatedApp, private headers: string[] = []) {
  }


  get = build(this, "get");
  post = build(this, "post");
  put = build(this, "put");
  ["delete"] = build(this, "del");
  del = build(this, "del");
  patch = build(this, "patch");
  any = build(this, "any");
  options = build(this, "options");

  run() {
    this.loadRoutes();
  }

  /** Loads all routes registered to this instance. */
  protected loadRoutes() {
    /** Prepends all routes with the prefixed path */
    this._routes = this._routes.map(metadata => {
      metadata.path = `${(this.constructor as IPresentiAPIFoundation<this>).prefix}${metadata.path}`;
      return metadata;
    });

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
    middleware = [CORSMiddleware, ServerLoader].concat((this.constructor as IPresentiAPIFoundation<this>).middleware).concat(middleware);

    ['authorization', 'host', 'origin'].forEach(header => {
      if (!headers.includes(header)) {
        headers.push(header);
      }
    });

    return handler(async (res, req) => {
      if (this.timedExecution) {
        var id = uuid.v4();
        log.profile(id);
      }
      const nRes = extendResponse(res, this.resolveTemplate.bind(this)), nReq = extendRequest(req, nRes);

      await runMiddleware(metadata, nReq, nRes, middleware);
      if (this.timedExecution) log.profile(id!, {
        message: `Processing for route completed`,
        level: 'debug',
        route: nReq.getUrl()
      });
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