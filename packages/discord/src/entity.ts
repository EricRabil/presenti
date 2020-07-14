import { Entity, BaseEntity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export default class Excludes extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column({ unique: true })
    userUUID: string;

    @Column("jsonb")
    excludes: string[];
}