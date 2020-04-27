import RestAPIBase from "../structs/rest-api-base";
import { RequestHandler, PBRequest, PBResponse } from "../utils/web/types";
export default class PresentiAPI extends RestAPIBase {
    loadRoutes(): void;
    buildStack(middleware: RequestHandler[], headers?: string[]): (res: import("uWebSockets.js").HttpResponse, req: import("uWebSockets.js").HttpRequest) => any;
    generateLinkCode(req: PBRequest, res: PBResponse): Promise<void>;
    validateLinkCode(req: PBRequest, res: PBResponse): Promise<void>;
    generateAPIKey(req: PBRequest, res: PBResponse): Promise<void>;
    redirectToDiscord(req: PBRequest, res: PBResponse): Promise<void>;
}
