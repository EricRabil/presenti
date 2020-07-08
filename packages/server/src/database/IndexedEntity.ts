import { BaseEntity, PrimaryGeneratedColumn, ColumnOptions, getMetadataArgsStorage, Column, getConnection, ObjectType } from "typeorm";
import { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import { ElasticService, IndexPayload, UpdatePayload, DeletePayload } from "./elastic";

/** Keeps track of ElasticSearch synchronized columns */
export namespace IndexedColumnStorage {
    interface IndexedColumnMetadataArgs {
        options: ElasticColumnOptions;
        metadata: ColumnMetadataArgs;
    }

    const columns: Map<typeof IndexedEntity, IndexedColumnMetadataArgs[]> = new Map();

    function ensure(target: typeof IndexedEntity) {
        if (!columns.get(target)) columns.set(target, []);
        return columns.get(target)!;
    }

    export function push(...args: IndexedColumnMetadataArgs[]) {
        args.forEach((arg) => {
            ensure(arg.metadata.target as typeof IndexedEntity).push(arg);
        });
    }

    export function get(target: typeof IndexedEntity) {
        return columns.get(target);
    }

    export function indexedEntities() {
        return Array.from(columns.keys());
    }
}

// Elastic Core Data

export type ElasticStringType = "text" | "keyword";
export type ElasticNumberType = "long" | "integer" | "short" | "byte" | "double" | "float" | "half_float" | "scaled_float";
export type ElasticDateType = "date";
export type ElasticDateNSType = "date_nanos";
export type ElasticBoolType = "boolean";
export type ElasticBinType = "binary";
export type ElasticRangeType = "integer_range" | "float_range" | "long_range" | "double_rang" | "date_range" | "ip_range";

export type ElasticCoreDataType = ElasticStringType | ElasticNumberType | ElasticDateType | ElasticDateNSType | ElasticBoolType | ElasticBinType | ElasticRangeType;

// Elastic Complex Data

export type ElasticObjectType = "object";
export type ElasticNestedType = "nested";

export type ElasticComplexDataType = ElasticObjectType | ElasticNestedType;

// Elastic Geo Data

export type ElasticGeoPointType = "geo_point";
export type ElasticGeoShapeType = "geo_shape";

export type ElasticGeoDataType = ElasticGeoPointType | ElasticGeoShapeType;

// Elastic Specialized Data

export type ElasticIPType = "ip";
export type ElasticCompletionType = "completion";
export type ElasticTokenCountType = "token_count";
export type ElasticMurmer3Type = "murmur3";
export type ElasticMapperText = "annotated-text";
export type ElasticPercolatorType = "percolator";
export type ElasticJoinType = "join";
export type ElasticRankFeatureType = "rank_feature";
export type ElasticRankFeaturesType = "rank_features";
export type ElasticDenseVectorType = "dense_vector";
export type ElasticSparseVectorType = "sparse_vector";
export type ElasticLiveSearchType = "search_as_you_type";
export type ElasticAliasType = "alias";
export type ElasticFlattenedType = "flattened";
export type ElasticShapeType = "shape";
export type ElasticHistogramType = "histogram";
export type ElasticConstantKeywordType = "constant_keyword";

export type ElasticSpecializedDataType = ElasticIPType | ElasticCompletionType | ElasticTokenCountType | ElasticMurmer3Type | ElasticMapperText | ElasticPercolatorType | ElasticJoinType | ElasticRankFeatureType | ElasticRankFeaturesType | ElasticDenseVectorType | ElasticSparseVectorType | ElasticLiveSearchType | ElasticAliasType | ElasticFlattenedType | ElasticShapeType | ElasticHistogramType | ElasticConstantKeywordType;

// All Datatypes

export type ElasticDataType = ElasticCoreDataType | ElasticComplexDataType | ElasticGeoDataType | ElasticSpecializedDataType;

export type ElasticAnalyzerType = "standard" | "simple" | "whitespace" | "stop" | "keyword" | "pattern" | "english" | "french" | "fingerprint";

export type ElasticDateFormatType = "epoch_millis" | "epoch_second" | "date_optional_time" | "strict_date_optional_time" | "strict_date_optional_time_nanos" | "basic_date" | "basic_date_time" | "basic_date_time_no_millis" | "basic_ordinal_date" | "basic_ordinal_date_time" | "basic_ordinal_date_time_no_millis" | "basic_time" | "basic_time_no_millis" | "basic_t_time" | "basic_t_time_no_millis" | "basic_week_date" | "strict_basic_week_date" | "basic_week_date_time" | "strict_basic_week_date_time" | "basic_week_date_time_no_millis" | "strict_basic_week_date_time_no_millis" | "date" | "strict_date" | "date_hour" | "strict_date_hour" | "date_hour_minute" | "strict_date_hour_minute" | "date_hour_minute_second" | "strict_date_hour_minute_second" | "date_hour_minute_second_fraction" | "strict_date_hour_minute_second_fraction" | "date_hour_minute_second_millis" | "strict_date_hour_minute_second_millis" | "date_time" | "strict_date_time" | "date_time_no_millis" | "strict_date_time_no_millis" | "hour" | "strict_hour" | "hour_minute" | "strict_hour_minute" | "hour_minute_second" | "strict_hour_minute_second" | "hour_minute_second_fraction" | "strict_hour_minute_second_fraction" | "hour_minute_second_millis" | "strict_hour_minute_second_millis" | "ordinal_date" | "strict_ordinal_date" | "ordinal_date_time" | "strict_ordinal_date_time" | "ordinal_date_time_no_millis" | "strict_ordinal_date_time_no_millis" | "time" | "strict_time" | "time_no_millis" | "strict_time_no_millis" | "t_time" | "strict_t_time" | "t_time_no_millis" | "strict_t_time_no_millis" | "week_date" | "strict_week_date" | "week_date_time" | "strict_week_date_time" | "week_date_time_no_millis" | "strict_week_date_time_no_millis" | "weekyear" | "strict_weekyear" | "weekyear_week" | "strict_weekyear_week" | "weekyear_week_day" | "strict_weekyear_week_day" | "year" | "strict_year" | "year_month" | "strict_year_month" | "year_month_day" | "strict_year_month_day";

/** Options for ElasticSearch columns */
export interface ElasticColumnOptions {
    type: ElasticDataType;
    analyzer?: ElasticAnalyzerType;
    fields?: Record<string, ElasticColumnOptions>;
    properties?: Record<string, ElasticColumnOptions>;

    /** @todo can these also apply to fields, or only the root property and their properties? */
    copy_to?: string;
    boost?: number;
    coerce?: boolean;
    doc_values?: boolean;
    dynamic?: "true" | "false" | "strict";
    eager_global_ordinals?: boolean;
    enabled?: boolean;
    fielddata?: boolean;
    fielddata_frequency_filter?: {
        min: number;
        max: number;
        min_segment_size: number;
    };
    format?: ElasticDateFormatType;
    ignore_above?: number;
    ignore_malformed?: boolean;
    index?: boolean;
    index_options?: "docs" | "freqs" | "positions" | "offsets";
    index_phrases?: boolean;
    index_prefixes?: {
        min_chars?: number;
        max_chars?: number;
    };
    meta?: any;
    normalizer?: string;
    norms?: boolean;
    null_value?: string | number | boolean;
    position_increment_gap?: number;
    search_analyzer?: ElasticAnalyzerType;
    similarity?: "BM25" | "classic" | "boolean";
    store?: boolean;
    term_vector?: "no" | "yes" | "with_positions" | "with_offsets" | "with_positions_offsets" | "with_positions_payloads" | "with_positions_offsets_payloads";
}

/** Columns that are to be synchronized with ElasticSearch */
export function IndexedColumn(options: ElasticColumnOptions, columnOptions?: ColumnOptions): Function {
    return function (object: Object, propertyName: string) {
        const metadata: ColumnMetadataArgs = {
            target: object.constructor,
            propertyName,
            mode: "regular",
            options: columnOptions || {}
        };

        Column(columnOptions!)(object, propertyName);
        IndexedColumnStorage.push({ options, metadata });
    }
}

/** Base class for entities that are synchronized with ElasticSearch */
export class IndexedEntity extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    /** Returns a delete entry suitable to be sent in a bulk operation */
    toElasticDelete(): DeletePayload {
        const entity = this.constructor as typeof IndexedEntity;

        return [{ delete: { _index: entity.tableName, _id: this.uuid } }];
    }

    /** Returns an update entry suitable to be sent in a bulk operation */
    toElasticUpdate(properties: (keyof this)[]): UpdatePayload {
        const entity = this.constructor as typeof IndexedEntity;

        return [{ update: { _index: entity.tableName, _id: this.uuid } },
                { doc: properties.reduce((acc, prop) => Object.assign(acc, {[prop]: this[prop]}), {}) }];
    }

    /** Returns an index entry suitable to be sent in a bulk operation */
    toElasticIndex(): IndexPayload {
        const entity = this.constructor as typeof IndexedEntity;

        const document = Object.entries(entity.createMapping())
                               .reduce((acc, [key]) => Object.assign(acc, { [key]: this[key] }), {});

        return [{ index: { _index: entity.tableName, _id: this.uuid } }, document ];
    }

    static get tableName() {
        return getConnection().getMetadata(this).tableName;
    }

    /** Returns a mapping definition for elasticsearch based on data specified in the IndexedColumnStorage */
    static createMapping(): Record<string, ElasticColumnOptions> {
        const indexedColumns = IndexedColumnStorage.get(this);
        if (!indexedColumns) return {};

        const properties = indexedColumns.reduce((acc, { options, metadata: { propertyName } }) => {
            return Object.assign(acc, { [propertyName]: options });
        }, {});

        return properties;
    }

    /** Ensures the table exists in elasticsearch and updates the stored records */
    static async rebuildElastic() {
        const exists = (await ElasticService.client.indices.exists({ index: this.tableName })).body;

        if (!exists) await ElasticService.client.indices.create({ index: this.tableName });

        const properties = this.createMapping();

        await ElasticService.client.indices.putMapping({
            index: this.tableName,
            body: {
                properties
            }
        });

        if (process.env.SYNCHRONIZE_ELASTIC) {
            const entities = await this.find();
            if (entities.length === 0) return;

            const body = entities.map(e => e.toElasticIndex()).flatMap(doc => doc);

            await ElasticService.client.bulk({ refresh: "true", body });
        }
    }

    static async search<T extends IndexedEntity>(this: ObjectType<T>, query: string, fields: string | string[]): Promise<T[]> {
        const res = await ElasticService.client.search({
            index: (this as typeof IndexedEntity).tableName,
            size: 10,
            body: {
                query: {
                    multi_match: {
                        query,
                        type: "bool_prefix",
                        fields
                    }
                }
            }
        });

        const { hits } = res.body.hits;
        const ids: string[] = hits.map(({ _id }) => _id);

        return await (this as typeof IndexedEntity).findByIds(ids) as T[];
    }

    static async searchOptimized<T extends IndexedEntity>(this: ObjectType<T>, query: string, searchField: string): Promise<T[]> {
        return (this as typeof IndexedEntity).search(query, [searchField, `${searchField}._2gram`, `${searchField}._3gram`]) as Promise<T[]>;
    }
}