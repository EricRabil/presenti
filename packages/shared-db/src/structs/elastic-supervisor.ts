import { Client, ClientOptions } from "@elastic/elasticsearch";
import logger from "@presenti/logging";
import { UpdatePayload, IndexPayload, DeletePayload, CreatePayload } from "../types/elastic";
import { getConnection } from "typeorm";
import { IndexedColumnStorage } from "../namespaces/indexed-column-storage";
import { IndexedEntitySubscriber } from "./indexed-entity-subscriber";

const ACTION_EXEC_INTERVAL = +process.env.ACTION_EXEC_INTERVAL! || 2500;
type PendingAction = IndexPayload | DeletePayload | CreatePayload | UpdatePayload;

var sharedSupervisor: ElasticSupervisor;

export class ElasticSupervisor {
    private constructor(public readonly options: ClientOptions) {
        if (sharedSupervisor) {
            throw new Error("Only one instance of the supervisor may exist at a time.");
        }
    }

    static init(options: ClientOptions) {
        return sharedSupervisor = new ElasticSupervisor(options);
    }

    static get sharedSupervisor() {
        return sharedSupervisor;
    }

    client: Client = new Client(this.options);
    log = logger.child({ name: "ElasticSupervisor" });
    interval: ReturnType<typeof setInterval>;

    pendingActions: PendingAction[] = [];

    /** Block promise resolution until successfully connected to ElasticSearch */
    async waitForConnection() {
        try {
            const health = await this.client.cluster.health({});
        } catch(e) {
            return await this.waitForConnection();
        }
    }

    /** Schedules the bulk execution of thequeue */
    scheduleQueueFlush() {
        this.interval = setTimeout(async () => {
            await this.flushQueue();
            this.scheduleQueueFlush();
        }, ACTION_EXEC_INTERVAL);
    }

    /** Bulk executes all queued actions */
    async flushQueue() {
        if (this.pendingActions.length === 0) return;

        const actions = this.pendingActions;
        this.pendingActions = [];

        await this.client.bulk({ refresh: "true", body: actions.flatMap(a => a)});

        this.log.debug(`Flushed ${actions.length} pending action(s)`);
    }

    async run() {
        if (!this.options) return;

        await this.waitForConnection();
        
        const entities = IndexedColumnStorage.indexedEntities();

        try {
            await Promise.all(entities.map(e => e.rebuildElastic()));
        } catch (e) {
            console.log(e.meta?.body?.error || e);
        }

        entities.forEach(entity => {
            getConnection().subscribers.push(new IndexedEntitySubscriber(entity, action => this.pendingActions.push(action)));
        });

        this.scheduleQueueFlush();
    }
}