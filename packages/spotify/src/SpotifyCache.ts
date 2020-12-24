import { AnalysisResult, SpotifyTrack } from "sactivity";
import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class MetadataCache extends BaseEntity {
    @PrimaryColumn("varchar")
    id: string;

    @Column("jsonb")
    track: SpotifyTrack;
}

@Entity()
export class AnalysisCache extends BaseEntity {
    @PrimaryColumn("varchar")
    id: string;

    @Column("jsonb")
    result: AnalysisResult;
}