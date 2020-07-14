import ajv from "ajv";
import { FIRST_PARTY_SCOPE, APIError } from "@presenti/utils";
import { RequestHandler, PBRequest } from "./utils";

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

/**
 * Accepts a handler function that will be expected to return true if valid, false if invalid, or a string with a custom error message.
 * @param handler validator function to be called
 */
export function Validator(handler: (req: PBRequest) => boolean | string): RequestHandler {
  return function (req, res, next) {
    const result = handler(req);
    if (result === true) return next();
    else {
      res.json(APIError.badRequest(typeof result === "string" ? result : undefined));
      next(true);
    }
  }
}

/**
 * Returns a composable middleware that passes the given schema to the ajv validator
 * @param schema validation schema, passed straight to ajv
 * @param message message to show on error, or the generic bad request message.
 */
export function AJVGuard(schema: object | string | boolean, message?: string) {
  return function(extractor: (req: PBRequest) => any): RequestHandler {
    const validator = new ajv({
      allErrors: true,
      useDefaults: true,
      verbose: false
    });

    return Validator(req => !validator.validate(schema, extractor(req)) ? (message || validator.errorsText(schema["errors"])) : true);
  }
}

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
