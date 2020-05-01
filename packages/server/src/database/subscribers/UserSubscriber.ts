import deepEqual from "deep-equal";
import { EventSubscriber, EntitySubscriberInterface, UpdateEvent } from "typeorm";
import { User } from "../entities/User";
import { EventBus, Events } from "../../event-bus";

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