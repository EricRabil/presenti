import { EventSubscriber, EntitySubscriberInterface, RemoveEvent, InsertEvent } from "typeorm";
import { OAuthLink } from "../entities/OAuthLink";
import { EventBus } from "../../event-bus";
import { Events } from "@presenti/utils";

@EventSubscriber()
export class OAuthSubscriber implements EntitySubscriberInterface<OAuthLink> {
  async afterInsert(event: InsertEvent<OAuthLink>) {
    EventBus.emit(Events.LINK_CREATE, await event.entity.resolvedJson());
  }

  async afterUpdate(event: InsertEvent<OAuthLink>) {
    EventBus.emit(Events.LINK_UPDATE, await event.entity.resolvedJson());
  }

  async beforeRemove(event: RemoveEvent<OAuthLink>) {
    if (event.entity) EventBus.emit(Events.LINK_REMOVE, await event.entity.resolvedJson())
  }

  listenTo() {
    return OAuthLink;
  }
}