import PBRestAPIBase, { API } from "../../structs/rest-api-base";
import { Get, PBRequest, PBResponse, APIError } from "@presenti/web";
import { UserLoader } from "../middleware/loaders";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import { UserAPI } from "../../api/user";

@API("/api/user")
export class RESTUserAPI extends PBRestAPIBase {
  @Get("/lookup", UserLoader(true))
  async lookupUser(req: PBRequest, res: PBResponse) {
    const { uuid, scope } = req.getSearch();
    const full = (res.user?.uuid === uuid) || (res.user === FIRST_PARTY_SCOPE);

    res.json(await UserAPI.queryUser({ uuid, userID: scope }));
  }

  @Get("/resolve")
  async resolveScope(req: PBRequest, res: PBResponse) {
    const { uuid } = req.getSearch();
    const scope = await UserAPI.resolveScopeFromUUID(uuid);
    
    if (scope instanceof APIError) return res.json(scope);
    res.json({ scope });
  }
}