import { Entity, BaseEntity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Storage<T> extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column()
  identifier: string;

  @Column("simple-json")
  data: T;
}