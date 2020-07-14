import { Get, PBRequest, PBResponse, Patch, BodyParser, Delete, Post, AJVGuard, RestAPIBase } from "@presenti/web";
import { API, GlobalGuards } from "@presenti/modules";
import { DenyFirstPartyGuard, IdentityGuard, UserLoader } from "@presenti/web";
import { TransformationsAPI } from "@presenti/shared-infrastructure";
import { APIError } from "@presenti/utils";

/**
 * GET /api/transformations – Returns all transformations for the currently authenticated user
 * POST /api/transformations({ rule: TransformationRule, ids: string[] }) – Creates a transformation with the given criteria for the given user
 * PATCH /api/transformations/:uuid({ rule: TransformationRule, ids?: string[] | null }) – Updates a given transformation
 * DELETE /api/transformations/:uuid – Deletes the transformation with the given ID
 */

const uuidSchema = {
  type: 'string',
  format: 'uuid'
};

const UUIDValidator = AJVGuard(uuidSchema, "Invalid UUID.")(req => req.getParameter(0));

@API("/api/transformations")
@GlobalGuards(UserLoader(true), IdentityGuard, DenyFirstPartyGuard)
export class RESTTransformationsAPI extends RestAPIBase {
  @Get()
  async lookupTransformations(req: PBRequest, res: PBResponse) {
    const transformations = await TransformationsAPI.transformations(res.user.uuid);

    res.json({ transformations });
  }

  @Post(BodyParser)
  async createTransformation(req: PBRequest, res: PBResponse) {
    const { rule, ids } = req.body, userUUID = res.user.uuid;

    const result = await TransformationsAPI.createTransformation(userUUID, { rule, ids });

    res.json(result);
  }

  @Patch("/:uuid", BodyParser, UUIDValidator)
  async updateTransformation(req: PBRequest, res: PBResponse) {
    const { rule, ids } = req.body, uuid = req.getParameter(0);

    const ownerUUID = await TransformationsAPI.authorUUIDForTransformation(uuid);
    if (ownerUUID instanceof APIError) return res.json(ownerUUID);
    if (ownerUUID !== res.user.uuid) return res.json(APIError.forbidden("You do not own this transformation."));

    const result = await TransformationsAPI.updateTransformation(uuid, { rule, ids });

    res.json(result);
  }

  @Delete("/:uuid", UUIDValidator)
  async deleteTransformation(req: PBRequest, res: PBResponse) {
    const uuid = req.getParameter(0);

    const ownerUUID = await TransformationsAPI.authorUUIDForTransformation(uuid);
    if (ownerUUID instanceof APIError) return res.json(ownerUUID);
    if (ownerUUID !== res.user.uuid) return res.json(APIError.forbidden("You do not own this transformation."));

    const result = await TransformationsAPI.deleteTransformationRule(uuid);

    res.json(result);
  }
}