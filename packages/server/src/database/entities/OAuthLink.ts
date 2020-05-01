import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, RelationId, ManyToOne } from "typeorm";
import { OAUTH_PLATFORM } from "@presenti/utils";
import { User } from "./User";

@Entity()
export class OAuthLink extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column({
    type: "enum",
    enum: OAUTH_PLATFORM
  })
  platform: OAUTH_PLATFORM;

  @Column()
  linkID: string;

  @ManyToOne(type => User, user => user.oAuthLinks)
  user: User;

  @RelationId("user")
  userUUID: string;
}