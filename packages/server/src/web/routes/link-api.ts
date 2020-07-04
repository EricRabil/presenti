import PBRestAPIBase from "../../structs/rest-api-base";
import { UserLoader } from "../middleware/loaders";
import { FirstPartyGuard } from "../middleware/guards";
import { Patch, PBRequest, PBResponse, Delete, BodyParser, Post, Get, APIError } from "@presenti/web";
import { API, GlobalGuards } from "@presenti/modules";
import { PipeDirection } from "@presenti/utils";
import { OAuthAPI } from "../../api/oauth";

function sanitizePipeDirection(direction: any): PipeDirection | null {
  if (typeof direction === "undefined") return PipeDirection.NOWHERE;

  if (isNaN(parseInt(direction))) direction = PipeDirection[direction];
  else direction = parseInt(direction)
  if (isNaN(direction)) return PipeDirection.NOWHERE;
  if (!PipeDirection[direction]) return PipeDirection.NOWHERE;

  return direction;
}

@API("/api/link")
@GlobalGuards(UserLoader(true), FirstPartyGuard)
export class RestLinkAPI extends PBRestAPIBase {
  @Patch("/:uuid/pipe", BodyParser)
  async updatePipeDirection(req: PBRequest, res: PBResponse) {
    var { direction } = req.body;
    const linkUUID = req.getParameter(0);

    direction = sanitizePipeDirection(direction);

    res.json(await OAuthAPI.updatePipeDirection({ uuid: linkUUID }, direction));
  }

  @Delete()
  async deleteLink(req: PBRequest, res: PBResponse) {
    const { uuid, platform, platformID, userUUID } = req.getSearch();

    res.json(await OAuthAPI.deleteLink({
      platform: platform as any,
      platformID,
      userUUID,
      uuid
    }));
  }

  @Post("", BodyParser)
  async createLink(req: PBRequest, res: PBResponse) {
    var { platform, platformID, userUUID, pipeDirection } = req.body; 

    pipeDirection = sanitizePipeDirection(pipeDirection);

    res.json(await OAuthAPI.createLink({
      platform,
      platformID,
      userUUID,
      pipeDirection
    }));
  }

  @Get("/bulk/:platform")
  async lookupLinkByPlatform(req: PBRequest, res: PBResponse) {
    const platform = req.getParameter(0);
    const { pipeDirection } = req.getSearch();

    const links = await OAuthAPI.lookupLinksForPlatform(platform as any);

    if (links instanceof APIError) return res.json(links);

    res.json({ links });
  }

  @Get()
  async lookupLink(req: PBRequest, res: PBResponse) {
    const { platform, platformID, userUUID, uuid } = req.getSearch();

    res.json(await OAuthAPI.lookupLink({
      platform: platform as any,
      platformID,
      userUUID,
      uuid
    }))
  }

  @Get("/user")
  async lookupUserFromLink(req: PBRequest, res: PBResponse) {
    const { platform, platformID, uuid } = req.getSearch();

    res.json(await OAuthAPI.lookupUser({
      platform: platform as any,
      platformID,
      uuid
    }));
  }
}