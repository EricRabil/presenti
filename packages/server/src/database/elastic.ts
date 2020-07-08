import { Client } from "@elastic/elasticsearch";
import { CONFIG } from "../utils/config";
import { User } from "./entities/User";
import { IndexedColumnStorage, IndexedEntity } from "./IndexedEntity";
import { EntitySubscriberInterface, getConnection, UpdateEvent, RemoveEvent, InsertEvent } from "typeorm";
import { Index } from "@elastic/elasticsearch/api/requestParams";
import log from "@presenti/logging";

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

/** Manages the interaction between Postgres tables and ElasticSearch indexes */
export namespace ElasticService {
    export var client: Client;

    const logger = log.child({ name: "ElasticService" });

    const actionExecutionInterval: number = 2500;
    var interval: ReturnType<typeof setInterval>;

    type PendingAction = IndexPayload | DeletePayload | CreatePayload | UpdatePayload;

    var pendingActions: PendingAction[] = [];

    /** Receives changes for a given indexed entity and queues those changes to be synchronized with ElasticSearch */
    class IndexedEntitySubscriber implements EntitySubscriberInterface {
        #indexedKeys: string[] = [];

        constructor(public readonly target: typeof IndexedEntity) {}

        afterInsert({ entity }: InsertEvent<IndexedEntity>) {
            pendingActions.push(entity.toElasticIndex());
        }

        beforeUpdate({ entity, databaseEntity }: UpdateEvent<IndexedEntity>) {
            if (entity && databaseEntity) {
                const { indexedKeys } = this;
                const changes = indexedKeys.filter(key => entity[key] !== databaseEntity[key]);
                
                if (changes.length === 0) return;
                pendingActions.push(entity.toElasticUpdate(changes as any[]))
            }
        }

        beforeRemove({ entity }: RemoveEvent<IndexedEntity>) {
            if (!entity) return;

            pendingActions.push(entity.toElasticDelete());
        }

        get indexedKeys() {
            return this.#indexedKeys || (this.#indexedKeys = IndexedColumnStorage.get(this.target)?.map(({ metadata: { propertyName } }) => propertyName) || []);
        }

        listenTo() {
            return this.target;
        }
    }

    /** Block promise resolution until successfully connected to ElasticSearch */
    async function waitForConnection() {
        try {
            const health = await client.cluster.health({});
        } catch {
            return waitForConnection();
        }
    }

    /** Schedules the bulk execution of thequeue */
    function scheduleQueueFlush() {
        interval = setTimeout(async () => {
            await flushQueue();
            scheduleQueueFlush();
        }, actionExecutionInterval);
    }

    /** Bulk executes all queued actions */
    async function flushQueue() {
        if (pendingActions.length === 0) return;

        const actions = pendingActions;
        pendingActions = [];

        await client.bulk({ refresh: "true", body: actions.flatMap(a => a)});

        logger.debug(`Flushed ${actions.length} pending action(s)`);
    }

    /** Connects to ElasticSearch and initializes indexes */
    export async function loadElastic() {
        if (!CONFIG.elasticSearch) return;

        client = new Client(CONFIG.elasticSearch);

        await waitForConnection();

        const entities = IndexedColumnStorage.indexedEntities();

        await Promise.all(entities.map(e => e.rebuildElastic()));

        entities.forEach(entity => {
            getConnection().subscribers.push(new IndexedEntitySubscriber(entity));
        });

        scheduleQueueFlush();
    }
}