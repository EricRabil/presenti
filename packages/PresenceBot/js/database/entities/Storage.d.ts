import { BaseEntity } from "typeorm";
export declare class Storage<T> extends BaseEntity {
    uuid: string;
    identifier: string;
    data: T;
}
