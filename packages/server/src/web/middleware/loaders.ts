import { RequestHandler } from "@presenti/web";
import { User } from "@presenti/shared-db";
import { SecurityKit } from "../../utils/security";
import { SharedPresenceService } from "../..";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";

/**
 * Loads a User object into the response variable, using the identity cookie, or the authorization header if specified
 * @param includeAuth should the authorization header be used to determine identity?
 */
export const UserLoader: (includeAuthorization?: boolean) => RequestHandler = includeAuth => async (req, res, next) => {
  const identity = req.cookie('identity'), authorization = (includeAuth ? req.getHeader('authorization') : null);
  if (!identity && !authorization) return next();
  const { user, firstParty } = identity ? { user: await SecurityKit.userForToken(identity), firstParty: false } : authorization ? await SecurityKit.validateApiKey(authorization) : { user: null, firstParty: false };

  if (user) {
    res.user = user;
  } else if (firstParty) {
    res.user = FIRST_PARTY_SCOPE;
  }
  
  next();
}

export const OAuthLoader: RequestHandler = (req, res, next) => {
  const oldRender = res.render;
  res.render = function(tpl, options) {
    oldRender.call(this, tpl, Object.assign({}, options, {
      oauth: SharedPresenceService.oauthDefinitions.reduce((acc, def) => def ? Object.assign(acc, { [def.key.toLowerCase()]: def }) : acc, {})
    }));
  }

  next();
}