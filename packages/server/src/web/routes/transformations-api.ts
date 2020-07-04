import Ajv from "ajv";
import { Get, PBRequest, PBResponse, Patch, BodyParser, APIError, Delete, Post, RequestHandler } from "@presenti/web";
import PBRestAPIBase from "../../structs/rest-api-base";
import { API, GlobalGuards } from "@presenti/modules";
import { DenyFirstPartyGuard, IdentityGuard } from "@presenti/web";
import { UserLoader } from "../middleware/loaders";
import { TransformationsAPI } from "../../api/transformations";

/**
 * GET /api/transformations – Returns all transformations for the currently authenticated user
 * POST /api/transformations({ rule: TransformationRule, ids: string[] }) – Creates a transformation with the given criteria for the given user
 * PATCH /api/transformations/:uuid({ rule: TransformationRule, ids?: string[] | null }) – Updates a given transformation
 * DELETE /api/transformations/:uuid – Deletes the transformation with the given ID
 */

const validator = new Ajv({
  allErrors: true,
  useDefaults: true,
  verbose: false
});

const uuidSchema = {
  type: 'string',
  format: 'uuid'
};

/**
 * Accepts a handler function that will be expected to return true if valid, false if invalid, or a string with a custom error message.
 * @param handler validator function to be called
 */
function Validator(handler: (req: PBRequest) => boolean | string): RequestHandler {
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
function AJVValidator(schema: object | string | boolean, message?: string) {
  return function(extractor: (req: PBRequest) => string): RequestHandler {
    return Validator(req => !validator.validate(schema, extractor(req)) ? (message || false) : true);
  }
}

const UUIDValidator = AJVValidator(uuidSchema, "Invalid UUID.");

@API("/api/transformations")
@GlobalGuards(UserLoader(true), IdentityGuard, DenyFirstPartyGuard)
export class RESTTransformationsAPI extends PBRestAPIBase {
  @Get()
  async lookupTransformations(req: PBRequest, res: PBResponse) {
    const transformations = await TransformationsAPI.transformations(res.user!.uuid);

    res.json({ transformations });
  }

  @Post(BodyParser)
  async createTransformation(req: PBRequest, res: PBResponse) {
    const { rule, ids } = req.body, userUUID = res.user!.uuid;

    const result = await TransformationsAPI.createTransformation(userUUID, { rule, ids });

    res.json(result);
  }

  @Patch("/:uuid", BodyParser, UUIDValidator(req => req.getParameter(0)))
  async updateTransformation(req: PBRequest, res: PBResponse) {
    const { rule, ids } = req.body, uuid = req.getParameter(0);

    const ownerUUID = await TransformationsAPI.authorUUIDForTransformation(uuid);
    if (ownerUUID instanceof APIError) return res.json(ownerUUID);
    if (ownerUUID !== res.user!.uuid) return res.json(APIError.forbidden("You do not own this transformation."));

    const result = await TransformationsAPI.updateTransformation(uuid, { rule, ids });

    res.json(result);
  }

  @Delete("/:uuid", UUIDValidator(req => req.getParameter(0)))
  async deleteTransformation(req: PBRequest, res: PBResponse) {
    const uuid = req.getParameter(0);

    const ownerUUID = await TransformationsAPI.authorUUIDForTransformation(uuid);
    if (ownerUUID instanceof APIError) return res.json(ownerUUID);
    if (ownerUUID !== res.user!.uuid) return res.json(APIError.forbidden("You do not own this transformation."));

    const result = await TransformationsAPI.deleteTransformationRule(uuid);

    res.json(result);
  }
}