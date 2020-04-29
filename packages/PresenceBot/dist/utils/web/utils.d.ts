import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { PBRequest, PBResponse, RequestHandler, HTTPMethod } from "./types";
export declare class MiddlewareTimeoutError extends Error {
}
/** Metadata for a Route */
export interface RouteData {
    /** absolute path for the route */
    path: string;
    /** request method for the route */
    method: HTTPMethod;
    /** property on the class that represents the route */
    property: string;
    /** any middleware to be called before handler execution */
    middleware: RequestHandler[];
}
/** Headers for common responses */
export declare const Responses: Record<string, [string, string]>;
/** Adds functions to an HttpRequest to meet the PBRequest specification */
export declare function wrapRequest(req: HttpRequest, res: PBResponse): PBRequest;
/** Adds functions to an HttpResponse to meet the PBResponse specification */
export declare function wrapResponse(res: HttpResponse, templateResolver?: (file: string) => string): PBResponse;
/**
 * Runs a stack of middleware with the given request and response
 * @param req request object
 * @param res response object
 * @param middleware middleware stack
 */
export declare function runMiddleware(metadata: RouteData, req: PBRequest, res: PBResponse, middleware: RequestHandler[]): Promise<void>;
