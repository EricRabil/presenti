import PBRestAPIBase, { API } from "../../structs/rest-api-base";
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
}