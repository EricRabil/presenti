import { CONFIG } from "../../utils/config";
import { FIRST_PARTY_SCOPE } from "../../structs/socket-api-base";
import { RequestHandler } from "@presenti/web";

/** Returns a 401 if the request is not authenticated */
export const IdentityGuard: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.error("Invalid identity token.", 401);
    return next(true);
  }
  next();
}

/** Renders an authentication error if the request is not authenticated */
export const IdentityGuardFrontend: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.setCookie('redirect', req.url, { httpOnly: true, maxAge: 60 * 2.5, path: "/" });
    res.render('login', { error: 'You must be logged in to perform this action.', signup: CONFIG.registration });
    return next(true);
  }
  next();
}

/** Blocks first-party requests to an endpoint */
export const DenyFirstPartyGuard: RequestHandler = async (req, res, next) => {
  if (res.user === (FIRST_PARTY_SCOPE as any)) {
    res.writeStatus(403).json({ error: "First-parties may not call this endpoint." });
    return next(true);
  }
  next();
}

/** Only accepts first-party requests to an endpoint */
export const FirstPartyGuard: RequestHandler = async (req, res, next) => {
  if (res.user !== (FIRST_PARTY_SCOPE as any)) {
    res.writeStatus(403).json({ error: "You are not authorized to use this endpoint." });
    return next(true);
  }
  next();
}