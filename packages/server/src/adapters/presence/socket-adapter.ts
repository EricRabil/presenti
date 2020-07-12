import { RemoteWSAPIBase } from "@presenti/shared-infrastructure";
import { PayloadType, SubscriptionPayload } from "@presenti/utils";
import { FirstParty, Handler, SocketContext } from "@presenti/ws";
import { EventBus } from "../../event-bus";

export class RemoteAdatpterV2 extends RemoteWSAPIBase {
  @Handler(PayloadType.SUBSCRIBE)
  @FirstParty()
  subscribeHandler(ws: SocketContext, { event: events }: SubscriptionPayload['data']) {
    const { id } = ws;
    
    if (!Array.isArray(events)) events = [events];
    events.forEach(event => {
      if (!this.subscriptions[event]) this.subscriptions[event] = [];
      if (this.subscriptions[event].includes(id)) return;
      this.subscriptions[event].push(id);

      /** Register that event on the EventBus if it hasn't already */
      if (!this.listeningTable[event]) {
        EventBus.on(event, data => this.handleEvent(event, data));
        this.listeningTable[event] = true;
      }
    })
  }

  @Handler(PayloadType.UNSUBSCRIBE)
  @FirstParty()
  unsubscribeHandler(ws: SocketContext, { event: events }: SubscriptionPayload['data']) {
    const { id } = ws;

    if (!Array.isArray(events)) events = [events];
    events.forEach(event => {
      if (!this.subscriptions[event]) return;
      if (!this.subscriptions[event].includes(id)) return;
      this.subscriptions[event].splice(this.subscriptions[event].indexOf(id), 1);
    });
  }
}