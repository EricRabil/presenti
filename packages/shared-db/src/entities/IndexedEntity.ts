import { BaseEntity, PrimaryGeneratedColumn, getConnection, ObjectType } from "typeorm";
import { DeletePayload, UpdatePayload, IndexPayload, ElasticColumnOptions } from "../types/elastic";
import { IndexedColumnStorage } from "../namespaces/indexed-column-storage";
import log from "@presenti/logging";
import { isValidSearchOptions } from "../validators/search";
import { APIError } from "@presenti/web";
import { SearchOptions, SearchResult } from "../types/search";
import { ResponseError } from "@elastic/elasticsearch/lib/errors";
import { ElasticSupervisor } from "../structs/elastic-supervisor";

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
                { doc: properties.reduce((acc, prop) => Object.assign(acc, { [prop]: this.elasticProperty(prop) }), {}) }];
    }

    /** Returns an index entry suitable to be sent in a bulk operation */
    toElasticIndex(): IndexPayload {
        const entity = this.constructor as typeof IndexedEntity;

        const document = Object.entries(entity.createMapping())
                               .reduce((acc, [key]) => Object.assign(acc, { [key]: this.elasticProperty(key as keyof this) }), {});

        return [{ index: { _index: entity.tableName, _id: this.uuid } }, document ];
    }

    private elasticProperty<T extends IndexedEntity>(this: T, prop: keyof T): any {
        const { [prop]: value } = this;

        if (value instanceof Date) {
            return value.toISOString();
        }

        return value;
    }

    static log = log.child({ name: "IndexedEntity" })

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
        if (process.env.SYNCHRONIZE_ELASTIC) {
            this.log.info(`Recreating index '${this.tableName}' per env (SYNCHRONIZE_ELASTIC=${process.env.SYNCHRONIZE_ELASTIC})`)
            await this.elastic.indices.delete({ index: this.tableName });
        }

        const exists = (await this.elastic.indices.exists({ index: this.tableName })).body;

        if (!exists) {
            await this.elastic.indices.create({ index: this.tableName });

            const properties = this.createMapping();

            await this.elastic.indices.putMapping({
                index: this.tableName,
                body: {
                    properties
                }
            });
        }

        if (process.env.SYNCHRONIZE_ELASTIC) {
            this.log.info(`Synchronizing records for '${this.tableName}' index, this may take a while.`);

            const entities = await this.find();
            if (entities.length === 0) return;

            const body = entities.map(e => e.toElasticIndex()).flatMap(doc => doc);

            await this.elastic.bulk({ refresh: "true", body });

            this.log.info(`Synchronizing for '${this.tableName}' completed.`);
        }
    }

    static async search<T extends IndexedEntity>(this: ObjectType<T>, { query, fields, sort, page, raw, max }: SearchOptions): Promise<SearchResult<T>> {
        if (!isValidSearchOptions({ query, fields, sort })) {
            throw APIError.badRequest("Invalid search options.");
        }

        max = max || 10;
        page = page || 1;

        try {
            const res = await (this as typeof IndexedEntity).elastic.search({
                index: (this as typeof IndexedEntity).tableName,
                size: max,
                from: max * (page - 1),
                body: {
                    query: {
                        multi_match: {
                            query,
                            type: "bool_prefix",
                            fields: Array.isArray(fields) ? fields : [fields]
                        }
                    },
                    sort
                }
            });
    
            const { hits, total: { value: total } } = res.body.hits;

            if (raw) {
                return { total, results: hits.map(({ _id: uuid, _source }) => Object.assign({}, _source, { uuid, raw: true })) }
            }

            return { total, results: await (this as typeof IndexedEntity).findByIds(hits.map(({ _id }) => _id)) as T[] };
        } catch (e) {
            if (e instanceof APIError) throw e;
            else if (e instanceof ResponseError) throw APIError.badRequest("Invalid search parameters.").data(e.meta.body.error);
            else throw APIError.internal("Internal server error.");
        }
    }

    static async searchOptimized<T extends IndexedEntity>(this: ObjectType<T>, options: SearchOptions): Promise<SearchResult<T>> {
        const { fields } = options;
        options.fields = (Array.isArray(fields) ? fields : [fields]).flatMap(searchField => [searchField, `${searchField}._2gram`, `${searchField}._3gram`])
        return (this as typeof IndexedEntity).search(options) as Promise<SearchResult<T>>;
    }

    static get elastic() {
        return ElasticSupervisor.sharedSupervisor.client;
    }
}