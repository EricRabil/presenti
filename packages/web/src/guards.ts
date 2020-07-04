import { FIRST_PARTY_SCOPE } from "@presenti/utils";
import { RequestHandler, APIError } from "./utils";

/** Returns a 401 if the request is not authenticated */
export const IdentityGuard: RequestHandler = async (req, res, next) => {
    if (!res.user) {
      res.json(APIError.unauthorized("Invalid identity token."));
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