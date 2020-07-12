import { Transformation } from "../database/entities";
import { Brackets } from "typeorm";
import { PresenceTransformationRecord, PresenceTransformation, PresenceStruct, TransformationModelCreateOptions, TransformationModelUpdateOptions } from "@presenti/utils";
import { APIError } from "@presenti/web";
import { isPresenceTransformation, applyTransformations } from "@presenti/utils";
import { UserAPI } from "./user";

export interface TransformationModel {
  ids: string[];
  transformations: PresenceTransformation[];
}

export namespace TransformationsAPI {
  export interface TransformationModelBulkResult {
    [id: string]: PresenceTransformation[];
  }

  function isUpdateOptions(obj: any): obj is TransformationModelUpdateOptions {
    console.log(obj)
    return (typeof obj === "object" && obj !== null)
        && ((typeof obj.ids === "object" && (Array.isArray(obj.ids) || obj.ids === null)) || typeof obj.ids === "undefined")
        && ((typeof obj.rule === "object" && (isPresenceTransformation(obj.rule) || obj.rule === null)) || typeof obj.rule === "undefined");
  }

  function isCreateOptions(obj: any): obj is TransformationModelCreateOptions {
    console.log({ obj });
    return (typeof obj === "object" && obj !== null)
        && (typeof obj.ids === "object" && Array.isArray(obj.ids))
        && (typeof obj.rule === "object" && isPresenceTransformation(obj.rule));
  }

  /**
   * For a given user scope, applies transformations to the array of presences where they match
   * @param scope 
   * @param presences 
   */
  export async function applyTransformationsForScope(scope: string, presences: PresenceStruct[]) {
    const uuid = await UserAPI.resolveUUIDFromScope(scope);

    if (uuid instanceof APIError) return APIError.notFound("Unknown user.");

    const transformations = await transformationsForIDs(uuid, presences.map(presence => presence.id).filter(id => typeof id === "string") as string[]);

    return Promise.all(presences.map(async presence => {
      if (!presence.id) return presence;
      if (!transformations[presence.id]) return presence;
      if (transformations[presence.id].length === 0) return presence;
      return applyTransformations(presence, transformations[presence.id]);
    }));
  }

  /**
   * Bulk queries the database for transformations with any of the provided identifiers, for the given user UUID
   * @param forUUID user UUID to query for
   * @param ids ids that the transformations can target
   */
  export async function transformationsForIDs(forUUID: string, ids: string[]) {
    const result: TransformationModelBulkResult = ids.reduce((acc, id) => Object.assign(acc, { [id]: [] }), {} as TransformationModelBulkResult);
    if (ids.length === 0) return result;

    var query = Transformation.createQueryBuilder();
    
    query.select().where({ authorUUID: forUUID }).andWhere(new Brackets(qb => {
      ids.forEach((id, idx) => {
        qb[idx === 0 ? "where" : "orWhere"](`ids @> :id${idx}`, { [`id${idx}`]: `"${id}"` });
      });
    }));

    const transformations = await query.getMany();

    transformations.forEach(transformation => {
      transformation.ids.forEach(id => {
        if (result[id]) result[id].push(transformation.rule!);
      });
    });

    return result;
  }

  /**
   * Returns the transformation records for a given user UUID
   * @param forUUID user UUID to query transformations for
   */
  export async function transformations(forUUID: string): Promise<PresenceTransformationRecord[]> {
    return Transformation.find({ authorUUID: forUUID }).then(records => records.map(record => record.json));
  }

  /**
   * Update the rule for a given transformation UUID
   * @param transformationUUID UUID of the transformation record to be updated
   */
  export async function updateTransformation(transformationUUID: string, { rule, ids }: TransformationModelUpdateOptions): Promise<PresenceTransformationRecord | APIError> {
    if (!isUpdateOptions({ rule, ids })) return APIError.badRequest("Bad update options.");

    const transformation = await Transformation.findOne({ uuid: transformationUUID });

    if (!transformation) return APIError.notFound("Unknown transformation.");

    if (rule) transformation.rule = rule;
    if (ids) transformation.ids = ids;

    await transformation.save();

    return transformation.json;
  }

  /**
   * Deletes the transformation rule with the given UUID
   * @param transformationUUID UUID of the transformation record to be deleted
   */
  export async function deleteTransformationRule(transformationUUID: string): Promise<{ ok: true } | APIError> {
    const result = await Transformation.delete({ uuid: transformationUUID });

    if (typeof result.affected === "number" && result.affected === 0) return APIError.notFound("Unknown transformation.");
    
    return { ok: true };
  }

  /**
   * Creates a transformation entry for the given user
   * @param forUUID user UUID
   * @param rule transformation rule
   * @param ids presence identifiers this can apply to
   */
  export async function createTransformation(forUUID: string, { rule, ids }: TransformationModelCreateOptions) {
    if (!isCreateOptions({ rule, ids })) return APIError.badRequest("Invalid create options.");

    const transformation = new Transformation();

    transformation.authorUUID = forUUID;
    transformation.ids = ids;
    transformation.rule = rule;

    await transformation.save();

    return transformation;
  }

  /**
   * Returns the UUID of the author for a given transformation UUID
   * @param withUUID the UUID of the transformation to lookup
   */
  export async function authorUUIDForTransformation(withUUID: string): Promise<string | APIError> {
    const ownerUUID = await Transformation.createQueryBuilder("transformation")
                                          .select(["transformation.author_uuid"])
                                          .where("transformation.uuid = :withUUID", { withUUID })
                                          .getRawOne()
                                          .then(fields => fields?.author_uuid);

    if (!ownerUUID) return APIError.notFound("Unknown transformation.");

    return ownerUUID;
  }
}