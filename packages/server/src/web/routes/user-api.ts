import { APIError, BodyParser, Delete, Get, Patch, PBRequest, PBResponse, Post, DenyFirstPartyGuard, IdentityGuard } from "@presenti/web";
import { OAuthAPI } from "../../api/oauth";
import { UserAPI } from "../../api/user";
import { User } from "../../database/entities";
import PBRestAPIBase from "../../structs/rest-api-base";
import { API } from "@presenti/modules";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";
import { UserLoader } from "../middleware/loaders";
import { CONFIG } from "../../utils/config";

@API("/api/user")
export class RESTUserAPI extends PBRestAPIBase {
  @Get("/lookup", UserLoader(true))
  async lookupUser(req: PBRequest, res: PBResponse) {
    const { uuid, scope } = req.getSearch();
    const full = (res.user?.uuid === uuid) || (res.user === FIRST_PARTY_SCOPE);

    res.json(await UserAPI.queryUser({ uuid, userID: scope }, full));
  }

  @Get("/resolve")
  async resolveScope(req: PBRequest, res: PBResponse) {
    const { uuid } = req.getSearch();
    const scope = await UserAPI.resolveScopeFromUUID(uuid);
    
    if (scope instanceof APIError) return res.json(scope);
    res.json({ scope });
  }

  @Get("/me", UserLoader(true), IdentityGuard)
  async whoami(req: PBRequest, res: PBResponse) {
    switch (res.user) {
      case FIRST_PARTY_SCOPE:
        res.json({ root: true });
        break;
      default:
        res.json(res.user.json(true));
        break;
    }
  }

  @Get("/me/key", UserLoader(), IdentityGuard, DenyFirstPartyGuard)
  async createKey(req: PBRequest, res: PBResponse) {
    const user: User = res.user;
    const key = await user.apiKey();

    res.json({ key });
  }

  /** Endpoint for the current user to modify the pipe direction of a given link */
  @Patch("/me/pipe/:uuid", UserLoader(true), IdentityGuard, DenyFirstPartyGuard, BodyParser)
  async patchPipe(req: PBRequest, res: PBResponse) {
    const uuid = req.getParameter(0);

    const { direction } = req.body || {};

    const result = await OAuthAPI.updatePipeDirection({
      uuid,
      userUUID: res.user.uuid
    }, direction);
    
    res.json(result);
  }

  @Delete("/me/pipe/:uuid", UserLoader(true), IdentityGuard, DenyFirstPartyGuard, BodyParser)
  async deletePipe(req: PBRequest, res: PBResponse) {
    const uuid = req.getParameter(0);

    const result = await OAuthAPI.deleteLink({
      uuid,
      userUUID: res.user.uuid
    });

    res.json(result);
  }

  @Patch("/me/password", UserLoader(), IdentityGuard, DenyFirstPartyGuard, BodyParser)
  async changePassword(req: PBRequest, res: PBResponse) {
    const { password, newPassword } = req.body;
    if (!password || !newPassword) return res.json(APIError.badRequest("The 'password' and 'newPassword' fields are required.").fields("password", "newPassword"));

    if (!await res.user!.checkPassword(password)) {
      return res.json(APIError.unauthorized("Invalid credentials.").fields("password"));
    }

    await res.user!.setPassword(newPassword);
    await res.user!.save();

    res.json({ ok: true });
  }

  @Post("/auth", BodyParser)
  async login(req: PBRequest, res: PBResponse) {
    const fail = () => res.json(APIError.unauthorized("Invalid credentials."));
    if (!req.body || !req.body.id || !req.body.password) {
      return fail();
    }

    const { id: userID, password } = req.body;
    const user = await User.findOne({ userID });
    if (!user) return fail();

    const token = await user.token(password);
    if (!token) return fail();
    
    res.setCookie('identity', token, { httpOnly: true, domain: CONFIG.web.cookieDomain, path: "/" });
    res.json(user.json(true));
  }

  @Get("/logout")
  async logout(req: PBRequest, res: PBResponse) {
    res.setCookie('identity', '', { httpOnly: true, domain: CONFIG.web.cookieDomain, path: "/", maxAge: 0 });
    res.json({ ok: true });
  }

  @Post("/new", BodyParser)
  async signup(req: PBRequest, res: PBResponse) {
    const fail = (msg: string) => res.json(APIError.badRequest(msg));

    if (!req.body || !req.body.id || !req.body.password) {
      return fail('Please fill out all required fields.');
    }

    const { id: userID, password } = req.body;
    let user = await User.findOne({ userID });
    /** UserID collision */
    if (user) return fail("A user with that ID already exists. Please select a different one.");

    user = await User.createUser(userID, password);
    await user.save();

    const token = await user.token(password);
    /** Token failed to generate, something's wrong with the algo */
    if (!token) return fail("Sorry, we couldn't finish logging you in.");

    res.setCookie('identity', token, { httpOnly: true, domain: CONFIG.web.cookieDomain, maxAge: 60 * 2.5, path: "/" });
    res.json(user.json(true));
  }
}