import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import { RequestHandler, HTTPMethod } from "../frontend/types";
export declare function Route(path: string, method: HTTPMethod, ...middleware: RequestHandler[]): <T extends RestAPIBase>(target: T, property: string, descriptor: PropertyDescriptor) => void;
export declare function Headers(...headers: string[]): any;
interface RouteData {
    path: string;
    method: HTTPMethod;
    property: string;
    middleware: RequestHandler[];
}
export default class RestAPIBase {
    readonly app: TemplatedApp;
    private viewsDirectory;
    _routes: RouteData[];
    constructor(app: TemplatedApp, viewsDirectory?: string);
    protected loadRoutes(): void;
    protected buildStack(middleware: RequestHandler[], headers?: string[]): (res: HttpResponse, req: HttpRequest) => any;
    protected buildHandler(handler: RequestHandler, headers?: string[]): (res: HttpResponse, req: HttpRequest) => any;
    private resolveTemplate;
}
export {};
