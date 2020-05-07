import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { Installation, InstallationQuery } from "@slack/oauth";

@Entity()
export class SlackInstallationRecord extends BaseEntity implements InstallationQuery {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column()
  teamId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  enterpriseId: string;

  @Column("simple-json")
  installation: Installation;
}