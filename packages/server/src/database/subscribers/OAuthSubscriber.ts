import { EventSubscriber, EntitySubscriberInterface, RemoveEvent, InsertEvent } from "typeorm";
import { OAuthLink } from "@presenti/shared-db";
import { Events } from "@presenti/utils";
import { SharedPresenceService } from "../..";

@EventSubscriber()
export class OAuthSubscriber implements EntitySubscriberInterface<OAuthLink> {
  async afterInsert(event: InsertEvent<OAuthLink>) {
    SharedPresenceService.api.publish(Events.LINK_CREATE, await event.entity.resolvedJson());
  }

  async afterUpdate(event: InsertEvent<OAuthLink>) {
    SharedPresenceService.api.publish(Events.LINK_UPDATE, await event.entity.resolvedJson());
  }

  async beforeRemove(event: RemoveEvent<OAuthLink>) {
    if (event.entity) SharedPresenceService.api.publish(Events.LINK_REMOVE, await event.entity.resolvedJson());
  }

  listenTo() {
    return OAuthLink;
  }
}