import { DecoratorBuilder } from "./util";
import { Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/** Columns that are to be synchronized with ElasticSearch */
export const IndexedColumn = DecoratorBuilder(Column);
export const IndexedCreateDateColumn = DecoratorBuilder(CreateDateColumn);
export const IndexedUpdateDateColumn = DecoratorBuilder(UpdateDateColumn);
