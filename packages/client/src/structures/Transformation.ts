import { PresenceTransformationRecord, PresenceTransformation, SuccessResponse, ErrorResponse, TransformationModelUpdateOptions } from "@presenti/utils/src";
import { RemoteClient, isErrorResponse } from "../RemoteClient";
import { Base } from "./Base";
import { TRANSFORMATION_ID } from "../Constants";
import { PresentiError } from "../utils/api-error";

export class Transformation extends Base implements PresenceTransformationRecord {
  uuid: string;
  rule: PresenceTransformation;
  ids: string[];

  constructor(client: RemoteClient, data?: PresenceTransformationRecord) {
    super(client);

    if (data) this._patch(data);
  }

  protected _patch(options: TransformationModelUpdateOptions) {
    this.rule = options.rule || this.rule;
    this.ids = options.ids || this.ids;

    return this;
  }

  /**
   * Delete the transformation
   */
  async delete(): Promise<void> {
    const res = await this.ajax.delete(TRANSFORMATION_ID(this.uuid));

    if (isErrorResponse(res)) {
      throw new PresentiError(res);
    }
  }

  /**
   * Edit the transformation data
   * @param options patches to apply
   */
  async patch(options: TransformationModelUpdateOptions): Promise<Transformation> {
    const res = await this.ajax.patch(TRANSFORMATION_ID(this.uuid), { body: options });

    if (isErrorResponse(res)) {
      throw new PresentiError(res);
    }

    return this._patch(res);
  }

  /**
   * Update the transformation rule
   * @param rule rule to replace it with
   */
  setRule(rule: PresenceTransformation) {
    return this.patch({ rule });
  }

  /**
   * Sets the identifiers this rule will apply to
   * @param ids ids to apply to
   */
  setIDs(ids: string[]) {
    return this.patch({ ids });
  }

  get json() {
    return {
      uuid: this.uuid,
      rule: this.rule,
      ids: this.ids
    }
  }
}