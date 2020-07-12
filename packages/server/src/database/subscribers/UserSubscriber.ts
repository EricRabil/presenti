import { EventSubscriber, EntitySubscriberInterface, UpdateEvent } from "typeorm";
import { User } from "@presenti/shared-db";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    beforeUpdate(event: UpdateEvent<User>) {
        if (!event.entity.attributes.banned && event.entity.attributes.banReason) {
            event.entity.attributes.banReason = undefined;
        }
    }

    listenTo() {
        return User;
    }
}