import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, InsertEvent, RemoveEvent } from "typeorm";
import { PresencePipe } from "../entities/Pipe";
import { EventBus, Events } from "../../event-bus";

@EventSubscriber()
export default class PipeSubscriber implements EntitySubscriberInterface<PresencePipe> {
  afterUpdate(event: UpdateEvent<PresencePipe>) {
    console.log({
      dbEntity: event.databaseEntity,
      entity: event.entity
    });
  }

  listenTo() {
    return PresencePipe;
  }

  afterInsert(event: InsertEvent<PresencePipe>) {
    EventBus.emit(Events.PIPE_CREATE, event.entity);
  }

  afterRemove(event: RemoveEvent<PresencePipe>) {
    if (!event.entity) return;
    EventBus.emit(Events.PIPE_DESTROY, event.entity);
  }
}