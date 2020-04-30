import RestAPIBase from "../structs/rest-api-base";
import { PBRequest, PBResponse, RequestHandler } from "../utils/web/types";
import { RouteData } from "../utils/web/utils";
export default class PresentiAPI extends RestAPIBase {
    log: import("winston").Logger;
    loadRoutes(): void;
    buildStack(metadata: RouteData, middleware: RequestHandler[], headers?: string[]): (res: import("uWebSockets.js").HttpResponse, req: import("uWebSockets.js").HttpRequest) => any;
    generateLinkCode(req: PBRequest, res: PBResponse): Promise<void>;
    validateLinkCode(req: PBRequest, res: PBResponse): Promise<void>;
    generateAPIKey(req: PBRequest, res: PBResponse): Promise<void>;
    redirectToDiscord(req: PBRequest, res: PBResponse): Promise<void>;
    unlinkDiscord(req: PBRequest, res: PBResponse): Promise<void>;
    discordCallback(req: PBRequest, res: PBResponse): Promise<void>;
    lookupUser(req: PBRequest, res: PBResponse): Promise<void>;
    get disableDiscordAPIs(): boolean;
}
