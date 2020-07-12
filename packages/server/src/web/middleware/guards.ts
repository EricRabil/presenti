import { CONFIG } from "../../utils/config";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";
import { RequestHandler, APIError } from "@presenti/web";

export const AdminGuard: RequestHandler = async (req, res, next) => {
  if (res.user?.attributes?.admin !== true) return res.json(APIError.forbidden("Only admins may access this endpoint."));
  next();
};

/** Only accepts first-party requests to an endpoint */
export const FirstPartyGuard: RequestHandler = async (req, res, next) => {
  if (res.user !== (FIRST_PARTY_SCOPE as any)) {
    res.writeStatus(403).json({ error: "You are not authorized to use this endpoint." });
    return next(true);
  }
  next();
}