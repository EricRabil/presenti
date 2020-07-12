//#region Elastic Core Data

export type ElasticStringType = "text" | "keyword";
export type ElasticNumberType = "long" | "integer" | "short" | "byte" | "double" | "float" | "half_float" | "scaled_float";
export type ElasticDateType = "date";
export type ElasticDateNSType = "date_nanos";
export type ElasticBoolType = "boolean";
export type ElasticBinType = "binary";
export type ElasticRangeType = "integer_range" | "float_range" | "long_range" | "double_rang" | "date_range" | "ip_range";

export type ElasticCoreDataType = ElasticStringType | ElasticNumberType | ElasticDateType | ElasticDateNSType | ElasticBoolType | ElasticBinType | ElasticRangeType;

//#endregion

//#region Elastic Complex Data

export type ElasticObjectType = "object";
export type ElasticNestedType = "nested";

export type ElasticComplexDataType = ElasticObjectType | ElasticNestedType;

//#endregion

//#region Elastic Geo Data

export type ElasticGeoPointType = "geo_point";
export type ElasticGeoShapeType = "geo_shape";

export type ElasticGeoDataType = ElasticGeoPointType | ElasticGeoShapeType;

//#endregion

//#region Elastic Specialized Data

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

//#endregion

//#region All Datatypes

export type ElasticDataType = ElasticCoreDataType | ElasticComplexDataType | ElasticGeoDataType | ElasticSpecializedDataType;

export type ElasticAnalyzerType = "standard" | "simple" | "whitespace" | "stop" | "keyword" | "pattern" | "english" | "french" | "fingerprint";

export type ElasticDateFormatType = "epoch_millis" | "epoch_second" | "date_optional_time" | "strict_date_optional_time" | "strict_date_optional_time_nanos" | "basic_date" | "basic_date_time" | "basic_date_time_no_millis" | "basic_ordinal_date" | "basic_ordinal_date_time" | "basic_ordinal_date_time_no_millis" | "basic_time" | "basic_time_no_millis" | "basic_t_time" | "basic_t_time_no_millis" | "basic_week_date" | "strict_basic_week_date" | "basic_week_date_time" | "strict_basic_week_date_time" | "basic_week_date_time_no_millis" | "strict_basic_week_date_time_no_millis" | "date" | "strict_date" | "date_hour" | "strict_date_hour" | "date_hour_minute" | "strict_date_hour_minute" | "date_hour_minute_second" | "strict_date_hour_minute_second" | "date_hour_minute_second_fraction" | "strict_date_hour_minute_second_fraction" | "date_hour_minute_second_millis" | "strict_date_hour_minute_second_millis" | "date_time" | "strict_date_time" | "date_time_no_millis" | "strict_date_time_no_millis" | "hour" | "strict_hour" | "hour_minute" | "strict_hour_minute" | "hour_minute_second" | "strict_hour_minute_second" | "hour_minute_second_fraction" | "strict_hour_minute_second_fraction" | "hour_minute_second_millis" | "strict_hour_minute_second_millis" | "ordinal_date" | "strict_ordinal_date" | "ordinal_date_time" | "strict_ordinal_date_time" | "ordinal_date_time_no_millis" | "strict_ordinal_date_time_no_millis" | "time" | "strict_time" | "time_no_millis" | "strict_time_no_millis" | "t_time" | "strict_t_time" | "t_time_no_millis" | "strict_t_time_no_millis" | "week_date" | "strict_week_date" | "week_date_time" | "strict_week_date_time" | "week_date_time_no_millis" | "strict_week_date_time_no_millis" | "weekyear" | "strict_weekyear" | "weekyear_week" | "strict_weekyear_week" | "weekyear_week_day" | "strict_weekyear_week_day" | "year" | "strict_year" | "year_month" | "strict_year_month" | "year_month_day" | "strict_year_month_day";

//#endregion

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

interface IdentifyingPayload {
    _index: string;
    _id: string;
}

interface IndexAction {
    index: IdentifyingPayload;
}

interface DeleteAction {
    delete: IdentifyingPayload;
}

interface CreateAction {
    create: IdentifyingPayload;
}

interface UpdateAction {
    update: IdentifyingPayload;
}

export type IndexPayload = [IndexAction, object];
export type DeletePayload = [DeleteAction];
export type CreatePayload = [CreateAction, object];
export type UpdatePayload = [UpdateAction, { doc: object }];
export type ElasticPayload = IndexPayload | DeletePayload | CreatePayload | UpdatePayload;