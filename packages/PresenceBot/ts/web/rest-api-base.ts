import path from "path";
import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { RequestHandler, HTTPMethod } from "./types";
import { runMiddleware, wrapResponse, wrapRequest } from "./utils";

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

export function Headers(...headers: string[]): any {
  return function (target: any, property: string, descriptor: PropertyDecorator) {
    const fn = target[property];
    fn.headers = headers;
  }
}

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

    exec(res, req);
  }
}

interface RouteData {
  path: string;
  method: HTTPMethod;
  property: string;
  middleware: RequestHandler[];
}

export default class RestAPIBase {
  _routes: RouteData[];

  constructor(readonly app: TemplatedApp, private viewsDirectory = path.resolve(__dirname, "..", "..", "frontend")) {
    this.loadRoutes();
  }

  protected loadRoutes() {
    this._routes.forEach(({ path, method, property, middleware }) => {
      const { [property]: handler } = this as any;
      middleware = middleware.concat(handler);
      this.app[method](path, this.buildStack(middleware, handler.headers || []));
    });
  }

  protected buildStack(middleware: RequestHandler[], headers: string[] = []) {
    return handler(async (res, req) => {
      const nRes = wrapResponse(res, this.resolveTemplate.bind(this)), nReq = wrapRequest(req, nRes);

      await runMiddleware(nReq, nRes, middleware);
    }, ['content-type', 'cookie'].concat(headers || []));
  }

  protected buildHandler(handler: RequestHandler, headers: string[] = []) {
    return this.buildStack([handler], headers);
  }

  private resolveTemplate(tpl: string) {
    if (!tpl.endsWith('.pug')) tpl = `${tpl}.pug`;
    return path.resolve(this.viewsDirectory, tpl);
  }
}