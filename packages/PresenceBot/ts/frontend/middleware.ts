import { CONFIG } from "../Configuration";
import { SecurityKit } from "../security";
import { FIRST_PARTY_SCOPE } from "../structs/socket-api-adapter";
import { RequestHandler } from "../web/types";

export const IdentityGuard: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.writeStatus(401).json({ e: 401, msg: "Invalid identity token." });
    return next(true);
  }
  next();
}

export const IdentityGuardFrontend: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.render('login', { error: 'You must be logged in to perform this action.', signup: CONFIG.registration });
    return next(true);
  }
  next();
}

export const FirstPartyGuard: RequestHandler = async (req, res, next) => {
  const authorization = req.getHeader('authorization');
  if (!authorization || (await SecurityKit.validateApiKey(authorization)) !== FIRST_PARTY_SCOPE) {
    res.writeStatus(403).json({ msg: "You are not authorized to access this endpoint." });
    return next(true);
  }
  next();
}