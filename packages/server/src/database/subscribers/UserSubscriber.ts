import { Events } from "@presenti/utils";
import deepEqual from "deep-equal";
import { EntitySubscriberInterface, EventSubscriber, UpdateEvent } from "typeorm";
import { EventBus } from "../../event-bus";
import { User } from "../entities/User";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  async afterUpdate(event: UpdateEvent<User>) {
    const { entity, databaseEntity } = event;

    const oauthChanged = !deepEqual(entity.platforms, databaseEntity.platforms);
    if (oauthChanged) {
      EventBus.emit(Events.OAUTH_UPDATE, {
        user: entity,
        platforms: entity.platforms
      });
    }
  }

  listenTo() {
    return User;
  }
}