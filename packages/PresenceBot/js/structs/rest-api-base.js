"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const utils_1 = require("../frontend/utils");
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
function Headers(...headers) {
    return function (target, property, descriptor) {
        const fn = target[property];
        fn.headers = headers;
    };
}
exports.Headers = Headers;
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
class RestAPIBase {
    constructor(app, viewsDirectory = path_1.default.resolve(__dirname, "..", "..", "frontend")) {
        this.app = app;
        this.viewsDirectory = viewsDirectory;
        this.loadRoutes();
    }
    loadRoutes() {
        this._routes.forEach(({ path, method, property, middleware }) => {
            const { [property]: handler } = this;
            middleware = middleware.concat(handler);
            this.app[method](path, this.buildStack(middleware, handler.headers || []));
        });
    }
    buildStack(middleware, headers = []) {
        return handler(async (res, req) => {
            const nRes = utils_1.wrapResponse(res, this.resolveTemplate.bind(this)), nReq = utils_1.wrapRequest(req, nRes);
            await utils_1.runMiddleware(nReq, nRes, middleware);
        }, ['content-type', 'cookie'].concat(headers || []));
    }
    buildHandler(handler, headers = []) {
        return this.buildStack([handler], headers);
    }
    resolveTemplate(tpl) {
        if (!tpl.endsWith('.pug'))
            tpl = `${tpl}.pug`;
        return path_1.default.resolve(this.viewsDirectory, tpl);
    }
}
exports.default = RestAPIBase;
