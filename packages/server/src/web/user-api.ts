import AuthClient from "@presenti/auth-client";
import { API } from "@presenti/modules";
import { FIRST_PARTY_SCOPE, PresentiUser, APIError } from "@presenti/utils";
import { AJVGuard, BodyParser, Delete, DenyFirstPartyGuard, Get, IdentityGuard, Patch, PBRequest, PBResponse, Post, UserLoader, RestAPIBase } from "@presenti/web";
import { OAuthAPI } from "@presenti/shared-infrastructure";
import { UserAPI } from "@presenti/shared-infrastructure";
import { CONFIG } from "../utils/config";

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
export class RESTUserAPI extends RestAPIBase {
  @Get("/lookup", UserLoader(true))
  async lookupUser(req: PBRequest, res: PBResponse) {
    const { uuid, scope } = req.getSearch();
    const full = (res.user?.uuid === uuid) || (res.user === FIRST_PARTY_SCOPE as any);

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
    switch (res.user as PresentiUser | typeof FIRST_PARTY_SCOPE) {
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

    res.json(await AuthClient.sharedInstance.apiKey(token));
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

    await AuthClient.sharedInstance.changePassword(res.user.userID, newPassword);

    res.json({ ok: true });
  }

  @Post("/auth", BodyParser)
  async login(req: PBRequest, res: PBResponse) {
    const fail = () => res.json(APIError.unauthorized("Invalid credentials."));
    if (!req.body || !req.body.id || !req.body.password) {
      return fail();
    }

    const { id: userID, password } = req.body;

    const { user, token } = await AuthClient.sharedInstance.createToken(userID, password);
    
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
    const { user, token } = await AuthClient.sharedInstance.createUser({ userID, password, displayName, email });

    res.setCookie('identity', token, { httpOnly: true, domain: CONFIG.web.cookieDomain, maxAge: 60 * 2.5, path: "/" });
    res.json(user);
  }
}