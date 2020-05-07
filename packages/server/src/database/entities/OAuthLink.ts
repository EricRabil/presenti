import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, RelationId, ManyToOne, ManyToMany, OneToMany } from "typeorm";
import { OAUTH_PLATFORM, PipeDirection, PresentiLink, ResolvedPresentiLink } from "@presenti/utils";
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
  platformID: string;

  @ManyToOne(type => User, user => user.oAuthLinks, { lazy: true })
  user: User;

  @RelationId("user")
  userUUID: string;

  @Column({
    type: "enum",
    enum: PipeDirection,
    default: PipeDirection.NOWHERE
  })
  pipeDirection: PipeDirection;

  get json(): PresentiLink {
    return {
      platform: this.platform,
      platformID: this.platformID,
      userUUID: this.userUUID,
      pipeDirection: this.pipeDirection
    }
  }

  async resolvedJson(): Promise<ResolvedPresentiLink> {
    return {
      ...this.json,
      scope: (await this.user)?.userID
    }
  }
}