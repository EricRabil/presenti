import { ListenerStorage } from "../utils";
import { Events, eventNameForCode } from "@presenti/utils";

export function Listener(event: Events | string): any {
    return function (target: any, property: string, descriptor: PropertyDecorator) {
        if (typeof event === "number") event = eventNameForCode(event);
        ListenerStorage.put(target.constructor, { property, event });
    }
}