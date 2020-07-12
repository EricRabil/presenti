import { EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from "typeorm";
import { IndexPayload, UpdatePayload, DeletePayload, ElasticPayload } from "../types/elastic";
import { IndexedEntity } from "../entities/IndexedEntity";
import { IndexedColumnStorage } from "../namespaces/indexed-column-storage";

export class IndexedEntitySubscriber implements EntitySubscriberInterface {
    #indexedKeys: Array<keyof IndexedEntity>;

    constructor(public readonly target: typeof IndexedEntity, protected readonly push: (action: ElasticPayload) => any) {}

    afterInsert({ entity }: InsertEvent<IndexedEntity>) {
        this.push(entity.toElasticIndex());
    }

    beforeUpdate({ entity, databaseEntity }: UpdateEvent<IndexedEntity>) {
        if (entity && databaseEntity) {
            const { indexedKeys } = this;
            const changes = indexedKeys.filter(key => entity[key] !== databaseEntity[key]);
            
            if (changes.length === 0) return;
            this.push(entity.toElasticUpdate(changes as any[]))
        }
    }

    beforeRemove({ entity }: RemoveEvent<IndexedEntity>) {
        if (!entity) return;

        this.push(entity.toElasticDelete());
    }

    get indexedKeys(): Array<keyof IndexedEntity> {
        return this.#indexedKeys || (this.#indexedKeys = IndexedColumnStorage.get(this.target)?.map(({ metadata: { propertyName } }) => propertyName as keyof IndexedEntity) || []);
    }

    listenTo() {
        return this.target;
    }
}