import { AJVGuard, APIError, BodyParser, Delete, Get, Patch, PBRequest, PBResponse, Post, DenyFirstPartyGuard, IdentityGuard } from "@presenti/web";
import { OAuthAPI } from "../../api/oauth";
import { UserAPI } from "../../api/user";
import { User } from "@presenti/shared-db";
import PBRestAPIBase from "../../structs/rest-api-base";
import { API } from "@presenti/modules";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";
import { UserLoader } from "../middleware/loaders";
import { CONFIG } from "../../utils/config";
import { SecurityKit } from "../../utils/security";

const LoginValidator = AJVGuard({
  properties: {
    id: {
      type: "string"
    },
    password: {
      type: "string"
    }
  },
  additionalProperties: false
})(req => req.body);

const SignupValidator = AJVGuard({
  properties: {
    id: {
      type: "string"
    },
    displayName: {
      type: "string"
    },
    email: {
      format: "email"
    },
    password: {
      type: "string"
    }
  },
  additionalProperties: false
})(req => req.body);

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
        res.json(res.user);
        break;
    }
  }

  @Get("/me/key")
  async createKey(req: PBRequest, res: PBResponse) {
    const token = req.cookie('identity');
    if (!token) throw APIError.unauthorized("You are not signed in.");

    res.json(await SecurityKit.apiKey(token));
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
    if (!password || !newPassword) return res.json(APIError.badRequest("The 'password' and 'newPassword' fields are required.").fields({
      password: ['This field is required.'],
      newPassword: ['This field is required.']
    }));

    await SecurityKit.changePassword(res.user.userID, newPassword);

    res.json({ ok: true });
  }

  @Post("/auth", BodyParser)
  async login(req: PBRequest, res: PBResponse) {
    const fail = () => res.json(APIError.unauthorized("Invalid credentials."));
    if (!req.body || !req.body.id || !req.body.password) {
      return fail();
    }

    const { id: userID, password } = req.body;

    const { user, token } = await SecurityKit.createToken(userID, password);
    
    res.setCookie('identity', token, { httpOnly: true, domain: CONFIG.web.cookieDomain, path: "/" });
    res.json(user);
  }

  @Get("/logout")
  async logout(req: PBRequest, res: PBResponse) {
    res.setCookie('identity', '', { httpOnly: true, domain: CONFIG.web.cookieDomain, path: "/", maxAge: 0 });
    res.json({ ok: true });
  }

  @Post("/new", BodyParser, SignupValidator)
  async signup(req: PBRequest, res: PBResponse) {
    const fail = (msg: string) => res.json(APIError.badRequest(msg));

    if (!req.body || !req.body.id || !req.body.password) {
      return fail('Please fill out all required fields.');
    }

    const { id: userID, password, displayName, email } = req.body;
    const { user, token } = await SecurityKit.createUser({ userID, password, displayName, email });

    res.setCookie('identity', token, { httpOnly: true, domain: CONFIG.web.cookieDomain, maxAge: 60 * 2.5, path: "/" });
    res.json(user);
  }
}