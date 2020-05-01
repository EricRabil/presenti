import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { RequestHandler, HTTPMethod } from "../utils/web/types";
import { RouteData } from "../utils/web/utils";
export declare function Route(path: string, method: HTTPMethod, ...middleware: RequestHandler[]): <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Get: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Post: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Patch: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Delete: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Put: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Any: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare const Options: (path: string, ...middleware: RequestHandler[]) => <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
/** set headers that the route will access */
export declare function Headers(...headers: string[]): any;
/**
 * Returns empty Route metadata
 * @param path route path
 * @param method request method
 */
export declare function RouteDataShell(path: string, method?: HTTPMethod): RouteData;
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
    protected buildStack(metadata: RouteData, middleware: RequestHandler[], headers?: string[]): (res: HttpResponse, req: HttpRequest) => any;
    /**
     * Builds a handler stack that has no extra middleware.
     *
     * @param handler handler function
     * @param headers headers to be loaded
     */
    protected buildHandler(metadata: RouteData, handler: RequestHandler, headers?: string[]): (res: HttpResponse, req: HttpRequest) => any;
    /**
     * Returns the absolute path of a template
     *
     * Acceptable inputs:
     * login login.pug
     * @param tpl template name
     */
    private resolveTemplate;
}
