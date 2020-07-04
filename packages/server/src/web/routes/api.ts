import PBRestAPIBase from "../../structs/rest-api-base";
import { API } from "@presenti/modules";
import { Get, PBRequest, PBResponse } from "@presenti/web";
import { SharedPresenceService } from "../..";

@API("/api")
export class RestTopAPI extends PBRestAPIBase {
  @Get("/platforms")
  async queryPlatforms(req: PBRequest, res: PBResponse) {
    res.json({
      platforms: SharedPresenceService.oauthDefinitions
    });
  }

  @Get("/presence/:scope")
  async getPresence(req: PBRequest, res: PBResponse) {
    const presences = await SharedPresenceService.presence(req.getParameter(0));

    res.json({ presences });
  }
}