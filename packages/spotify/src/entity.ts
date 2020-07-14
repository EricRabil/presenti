import { Entity, BaseEntity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class SpotifyModuleStorage extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    key: string;
}