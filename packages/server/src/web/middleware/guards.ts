import { CONFIG } from "../../utils/config";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";
import { RequestHandler } from "@presenti/web";

/** Renders an authentication error if the request is not authenticated */
export const IdentityGuardFrontend: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.setCookie('redirect', req.url, { httpOnly: true, maxAge: 60 * 2.5, path: "/" });
    res.render('login', { error: 'You must be logged in to perform this action.', signup: CONFIG.registration });
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