"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils/web/utils");
function Route(path, method, ...middleware) {
    return function (target, property, descriptor) {
        if (!target._routes)
            target._routes = [];
        target._routes.push({
            path,
            method,
            property,
            middleware
        });
    };
}
exports.Route = Route;
const BuildRouteShorthand = (method) => (path, ...middleware) => Route(path, method, ...middleware);
exports.Get = BuildRouteShorthand("get");
exports.Post = BuildRouteShorthand("post");
exports.Patch = BuildRouteShorthand("patch");
exports.Delete = BuildRouteShorthand("del");
exports.Put = BuildRouteShorthand("put");
exports.Any = BuildRouteShorthand("any");
exports.Options = BuildRouteShorthand("options");
function Headers(...headers) {
    return function (target, property, descriptor) {
        const fn = target[property];
        fn.headers = headers;
    };
}
exports.Headers = Headers;
function RouteDataShell(path, method = "any") {
    return {
        path,
        property: null,
        method,
        middleware: []
    };
}
exports.RouteDataShell = RouteDataShell;
function handler(exec, headers = []) {
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
    };
}
/** Foundation for any HTTP-based service */
class RestAPIBase {
    constructor(app, viewsDirectory = path_1.default.resolve(__dirname, "..", "..", "frontend")) {
        this.app = app;
        this.viewsDirectory = viewsDirectory;
        this.loadRoutes();
    }
    /** Loads all routes registered to this instance. */
    loadRoutes() {
        this._routes.forEach((metadata) => {
            let { path, method, property, middleware } = metadata;
            const handler = (req, res, next, eNext) => this[property](req, res, next, eNext);
            const headers = this[property].headers;
            middleware = middleware.concat(handler);
            this.app[method](path, this.buildStack(metadata, middleware, headers || []));
        });
    }
    /**
     * Returns a compiled middleware stack given a set of RequestHandlers.
     *
     * Override this function to append/prepend middleware, and to modify the headers to be loaded.
     * @param middleware handler stack
     * @param headers headers to be loaded
     */
    buildStack(metadata, middleware, headers = []) {
        return handler(async (res, req) => {
            const nRes = utils_1.wrapResponse(res, this.resolveTemplate.bind(this)), nReq = utils_1.wrapRequest(req, nRes);
            await utils_1.runMiddleware(metadata, nReq, nRes, middleware);
        }, ['content-type', 'cookie'].concat(headers || []));
    }
    /**
     * Builds a handler stack that has no extra middleware.
     *
     * @param handler handler function
     * @param headers headers to be loaded
     */
    buildHandler(metadata, handler, headers = []) {
        return this.buildStack(metadata, [handler], headers);
    }
    /**
     * Returns the absolute path of a template
     *
     * Acceptable inputs:
     * login login.pug
     * @param tpl template name
     */
    resolveTemplate(tpl) {
        if (!tpl.endsWith('.pug'))
            tpl = `${tpl}.pug`;
        return path_1.default.resolve(this.viewsDirectory, tpl);
    }
}
exports.default = RestAPIBase;
