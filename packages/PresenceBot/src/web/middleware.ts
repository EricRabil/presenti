import { CONFIG } from "../utils/config";
import { SecurityKit } from "../utils/security";
import { FIRST_PARTY_SCOPE } from "../structs/socket-api-base";
import { RequestHandler } from "../utils/web/types";

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

export const DenyFirstPartyGuard: RequestHandler = async (req, res, next) => {
  if (res.user === (FIRST_PARTY_SCOPE as any)) {
    res.writeStatus(403).json({ error: "First-parties may not call this endpoint." });
    return next(true);
  }
  next();
}

export const FirstPartyGuard: RequestHandler = async (req, res, next) => {
  if (res.user !== (FIRST_PARTY_SCOPE as any)) {
    res.writeStatus(403).json({ error: "You are not authorized to use this endpoint." });
    return next(true);
  }
  next();
}