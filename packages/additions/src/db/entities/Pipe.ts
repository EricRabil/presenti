import { Entity, BaseEntity, Column, PrimaryGeneratedColumn } from "typeorm";
import { OAUTH_PLATFORM } from "@presenti/utils";

@Entity()
export class PresencePipe extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column({
    type: "enum",
    enum: OAUTH_PLATFORM
  })
  platform: OAUTH_PLATFORM;

  @Column()
  platformID: string;

  @Column()
  scope: string;
}