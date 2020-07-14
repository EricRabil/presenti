import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { PresenceTransformation, PresenceTransformationRecord } from "@presenti/utils";

@Entity()
export class Transformation extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @ManyToOne(type => User, { eager: false })
  @JoinColumn({ name: "author_uuid", referencedColumnName: "uuid" })
  author: User;

  @Column({ name: "author_uuid" })
  authorUUID: string;

  @Column("jsonb", { array: false, default: '[]' })
  ids: string[];

  @Column("jsonb", { nullable: true })
  rule: PresenceTransformation | null;

  get json(): PresenceTransformationRecord {
    return {
      uuid: this.uuid,
      rule: this.rule,
      ids: this.ids
    }
  }
}