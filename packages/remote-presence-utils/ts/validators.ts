import { RemotePayload, RemotePresencePayload, FirstPartyPresencePayload, IdentifyPayload, PingPayload, PongPayload, GreetingsPayload } from "./types";
import { PayloadType } from "./types";

export function isPresencePayload(payload: RemotePayload): payload is RemotePresencePayload {
  return payload.type === PayloadType.PRESENCE && "data" in payload;
}

export function isFirstPartyPresencePayload(payload: RemotePayload): payload is FirstPartyPresencePayload {
  return payload.type === PayloadType.PRESENCE_FIRST_PARTY
      && "data" in payload
      && typeof payload.data.scope === "string"
      && "presence" in payload.data;
}

export function isIdentifyPayload(payload: RemotePayload): payload is IdentifyPayload {
  return payload.type === PayloadType.IDENTIFY
      && typeof payload.data === "string";
}

export function isPingPayload(payload: RemotePayload): payload is PingPayload {
  return payload.type === PayloadType.PING;
}

export function isPongPayload(payload: RemotePayload): payload is PongPayload {
  return payload.type === PayloadType.PONG;
}

export function isGreetingsPayload(payload: RemotePayload): payload is GreetingsPayload {
  return payload.type === PayloadType.GREETINGS;
}

export const PayloadValidators: Record<PayloadType, (payload: RemotePayload) => boolean> = {
  [PayloadType.PRESENCE_FIRST_PARTY]: isFirstPartyPresencePayload,
  [PayloadType.PRESENCE]: isPresencePayload,
  [PayloadType.IDENTIFY]: isIdentifyPayload,
  [PayloadType.PING]: isPingPayload,
  [PayloadType.PONG]: isPongPayload,
  [PayloadType.GREETINGS]: isGreetingsPayload
};