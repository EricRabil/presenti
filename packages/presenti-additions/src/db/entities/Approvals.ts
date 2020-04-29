import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";
import { OAUTH_PLATFORM } from "remote-presence-utils";

/** Represents a platform user with elevated API access */
@Entity()
@Unique("PLATFORM_USER", ["platform", "platformID"])
export class Approvals extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column({
    type: "enum",
    enum: OAUTH_PLATFORM
  })
  platform: OAUTH_PLATFORM;

  @Column()
  platformID: string;

  static isPromoted(platform: OAUTH_PLATFORM, platformID: string) {
    return this.findOne({ platform, platformID }).then(p => !!p);
  }

  static approve(platform: OAUTH_PLATFORM, platformID: string) {
    return this.createQueryBuilder()
              .insert()
              .values(Approvals.create({ platform, platformID }))
              .onConflict("DO NOTHING")
              .execute();
  }

  static deny(platform: OAUTH_PLATFORM, platformID: string) {
    return this.createQueryBuilder()
              .delete()
              .where("platform = :platform", { platform })
              .andWhere("platformID = :platformID", { platformID })
              .execute();
  }
}