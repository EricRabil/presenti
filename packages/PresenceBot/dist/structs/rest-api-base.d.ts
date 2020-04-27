import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { RequestHandler, HTTPMethod } from "../utils/web/types";
export declare function Route(path: string, method: HTTPMethod, ...middleware: RequestHandler[]): <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare function Headers(...headers: string[]): any;
interface RouteData {
    path: string;
    method: HTTPMethod;
    property: string;
    middleware: RequestHandler[];
}
/** Foundation for any HTTP-based service */
export default class RestAPIBase {
    readonly app: TemplatedApp;
    private viewsDirectory;
    _routes: RouteData[];
    constructor(app: TemplatedApp, viewsDirectory?: string);
    /** Loads all routes registered to this instance. */
    protected loadRoutes(): void;
    /**
     * Returns a compiled middleware stack given a set of RequestHandlers.
     *
     * Override this function to append/prepend middleware, and to modify the headers to be loaded.
     * @param middleware handler stack
     * @param headers headers to be loaded
     */
    protected buildStack(middleware: RequestHandler[], headers?: string[]): (res: HttpResponse, req: HttpRequest) => any;
    /**
     * Builds a handler stack that has no extra middleware.
     *
     * @param handler handler function
     * @param headers headers to be loaded
     */
    protected buildHandler(handler: RequestHandler, headers?: string[]): (res: HttpResponse, req: HttpRequest) => any;
    /**
     * Returns the absolute path of a template
     *
     * Acceptable inputs:
     * login login.pug
     * @param tpl template name
     */
    private resolveTemplate;
}
export {};
