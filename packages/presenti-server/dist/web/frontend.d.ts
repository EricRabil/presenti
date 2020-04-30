import { TemplatedApp } from "uWebSockets.js";
import RestAPIBase from "../structs/rest-api-base";
import { PBRequest, PBResponse, RequestHandler } from "../utils/web/types";
import { RouteData } from "../utils/web/utils";
/** Frontend routes */
export default class Frontend extends RestAPIBase {
    readonly app: TemplatedApp;
    static readonly VIEWS_DIRECTORY: string;
    static readonly STATIC_DIRECTORY: string;
    static readonly PRESENTI_ASSET_DIRECTORY: string;
    constructor(app: TemplatedApp);
    loadRoutes(): void;
    buildStack(metadata: RouteData, middleware: RequestHandler[], headers?: string[]): (res: import("uWebSockets.js").HttpResponse, req: import("uWebSockets.js").HttpRequest) => any;
    /** Renders the login page */
    loginView(req: PBRequest, res: PBResponse): void;
    /** Renders the signup page, if registration is enabled */
    signupView(req: PBRequest, res: PBResponse): void;
    /** Renders the change password page, if the user is signed in */
    changePassword(req: PBRequest, res: PBResponse): void;
    /** Called upon change password form submission, accepts "password" and "newPassword" in the form body */
    changePasswordComplete(req: PBRequest, res: PBResponse): Promise<void>;
    /** Called upon signup form submission, accepts "id" and "password" in the form body */
    signupComplete(req: PBRequest, res: PBResponse): Promise<void>;
    /** Called to sign out the user */
    logout(req: PBRequest, res: PBResponse): void;
    /** Called upon login form submission, accepts "id" and "password" in form submission */
    loginComplete(req: PBRequest, res: PBResponse): Promise<void>;
    /** Renders the panel if signed in, and the login page otherwise */
    rootHandler(req: PBRequest, res: PBResponse): void;
    /** Renders the panel home page */
    panelView(req: PBRequest, res: PBResponse): void;
    /** Serves assets for the presenti renderer */
    presentiAssets(req: PBRequest, res: PBResponse): Promise<void>;
    /** Serves the page for the presenti renderer */
    renderer(req: PBRequest, res: PBResponse): void;
    /** Serves static assets for the panel */
    staticAsset(req: PBRequest, res: PBResponse): Promise<void>;
    /** Resolves template files */
    static resolve(file: string): string;
    /** Resolves static assets */
    static resolveStatic(file: string): string | null;
    /** Resolves presenti-renderer assets */
    static resolvePresenti(file: string): Promise<string | null>;
}
