import IORedis from "ioredis";
import { ElasticColumnOptions } from "./types/elastic";
import { ColumnOptions } from "typeorm";
import { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import { IndexedColumnStorage } from "./namespaces/indexed-column-storage";

export function DecoratorBuilder(parent: Function) {
    return function (options: ElasticColumnOptions, columnOptions?: ColumnOptions): Function {
        return function (object: Object, propertyName: string) {
            const metadata: ColumnMetadataArgs = {
                target: object.constructor,
                propertyName,
                mode: "regular",
                options: columnOptions || {}
            };
    
            parent(columnOptions!)(object, propertyName);
            IndexedColumnStorage.push({ options, metadata });
        }
    }
}
