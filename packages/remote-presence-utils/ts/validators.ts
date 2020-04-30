import { RemotePayload, RemotePresencePayload, FirstPartyPresencePayload, IdentifyPayload, PingPayload, PongPayload, GreetingsPayload, PresenceStruct, PresenceText, PresenceImage, PresenceTimeRange } from "./types";
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

export function isPresentiText(obj: any): obj is PresenceText {
  if (typeof obj === "string" || obj === null) return true;
  if (typeof obj !== "object") return false;
  const keys = ["text", "link"];
  const objKeys = Object.keys(obj);
  const fastInvalid = objKeys.find(key => !keys.includes(key));
  if (fastInvalid) return false;
  if (typeof obj.text !== "string") return false;
  if (obj.link && !(typeof obj.link === "string" || obj.link === null)) return false;
  return true;
}

export function isPresentiImage(obj: any): obj is PresenceImage {
  if (typeof obj !== "object") return false;
  if (obj === null) return true;
  const keys = ["src", "link"];
  const objKeys = Object.keys(obj);
  const fastInvalid = objKeys.find(key => !keys.includes(key));
  if (fastInvalid) return false;
  if (typeof obj.text !== "string") return false;
  if (typeof obj.link !== "string" && obj.link !== null) return false;
  return true;
}

export function isPresentiTimeRange(obj: any): obj is PresenceTimeRange {
  if (typeof obj !== "object") return false;
  if (obj === null) return true;
  const keys = ["start", "stop"];
  const objKeys = Object.keys(obj);
  const fastInvalid = objKeys.find(key => !keys.includes(key));
  if (fastInvalid) return false;
  if (typeof obj.start !== "number" && obj.start !== null) return false;
  if (typeof obj.stop !== "number" && obj.stop !== null) return false;
  return true;
}

export function isPresentiStruct(obj: any): obj is PresenceStruct {
  const keys: Array<keyof PresenceStruct> = ["id", "title", "largeText", "smallTexts", "image", "timestamps", "gradient", "shades", "isPaused"];
  const objKeys: Array<keyof PresenceStruct> = Object.keys(keys) as any;
  const fastInvalid = objKeys.find(key => !keys.includes(key));
  if (fastInvalid) return false;
  
  for (let key of objKeys) {
    switch (key) {
      case "id":
        if (typeof obj.id === "string" || obj.id === null) continue;
        return false;
      case "title":
        if (typeof obj.title === "string" || obj.title === null) continue;
        return false;
      case "largeText":
        if (isPresentiText(obj.largeText)) continue;
        return false;
      case "smallTexts":
        if (obj.smallTexts === null) continue;
        if (Array.isArray(obj.smallTexts) && obj.smallTexts.every((text: any) => isPresentiText(text))) continue;
        return false;
      case "image":
        if (obj.image === null) continue;
        if (isPresentiImage(obj.image)) continue;
        return false;
      case "timestamps":
        if (obj.timestamps === null) continue;
        if (isPresentiTimeRange(obj.timestamps)) continue;
        return false;
      case "gradient":
        if (obj.gradient === null) continue;
        if (typeof obj.gradient === "boolean") continue;
        if (typeof obj.gradient === "object" && (typeof obj.gradient.enabled === "boolean" && (obj.gradient.priority ? (typeof obj.gradient.priority === "number" || obj.gradient.priority === null) : true))) continue;
        return false;
      case "shades":
        if (obj.shades === null) continue;
        if (Array.isArray(obj.shades) && obj.shades.every((shade: unknown) => typeof shade === "string")) continue;
        return false;
      case "isPaused":
        if (obj.isPaused === null) continue;
        if (typeof obj.isPaused === "boolean") continue;
        return false;
      default:
        return false;
    }
  }

  return true;
}

export const PayloadValidators: Record<PayloadType, (payload: RemotePayload) => boolean> = {
  [PayloadType.PRESENCE_FIRST_PARTY]: isFirstPartyPresencePayload,
  [PayloadType.PRESENCE]: isPresencePayload,
  [PayloadType.IDENTIFY]: isIdentifyPayload,
  [PayloadType.PING]: isPingPayload,
  [PayloadType.PONG]: isPongPayload,
  [PayloadType.GREETINGS]: isGreetingsPayload
};