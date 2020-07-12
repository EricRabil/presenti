import { ElasticColumnOptions } from "../types/elastic";
import { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import { IndexedEntity } from "../entities/IndexedEntity";

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