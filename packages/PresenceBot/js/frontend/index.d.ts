import { TemplatedApp } from "uWebSockets.js";
import { PBResponse, PBRequest, HTTPMethod, RequestHandler } from "./types";
interface RouteData {
    path: string;
    method: HTTPMethod;
    property: string;
    middleware: RequestHandler[];
}
export declare class MiddlewareTimeoutError extends Error {
}
export default class Frontend {
    readonly app: TemplatedApp;
    static readonly VIEWS_DIRECTORY: string;
    static readonly STATIC_DIRECTORY: string;
    static readonly PRESENTI_ASSET_DIRECTORY: string;
    static readonly ROUTES: RouteData[];
    constructor(app: TemplatedApp);
    loadRoutes(): void;
    static buildStack(middleware: RequestHandler[], headers?: string[]): (res: import("uWebSockets.js").HttpResponse, req: import("uWebSockets.js").HttpRequest) => any;
    static buildHandler(handler: RequestHandler, headers?: string[]): (res: import("uWebSockets.js").HttpResponse, req: import("uWebSockets.js").HttpRequest) => any;
    loginView(req: PBRequest, res: PBResponse): void;
    signupView(req: PBRequest, res: PBResponse): void;
    changePassword(req: PBRequest, res: PBResponse): void;
    changePasswordComplete(req: PBRequest, res: PBResponse): Promise<void>;
    signupComplete(req: PBRequest, res: PBResponse): Promise<void>;
    logout(req: PBRequest, res: PBResponse): void;
    loginComplete(req: PBRequest, res: PBResponse): Promise<void>;
    rootHandler(req: PBRequest, res: PBResponse): void;
    panelView(req: PBRequest, res: PBResponse): void;
    generateLinkCode(req: PBRequest, res: PBResponse): Promise<void>;
    generateAPIKey(req: PBRequest, res: PBResponse): Promise<void>;
    presentiAssets(req: PBRequest, res: PBResponse): Promise<void>;
    renderer(req: PBRequest, res: PBResponse): void;
    jwtTester(req: PBRequest, res: PBResponse): Promise<void>;
    staticAsset(req: PBRequest, res: PBResponse): Promise<void>;
    static resolve(file: string): string;
    static resolveStatic(file: string): string | null;
    static resolvePresenti(file: string): Promise<string | null>;
}
export {};
