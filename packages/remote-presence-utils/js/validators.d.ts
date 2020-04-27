import { RemotePayload, RemotePresencePayload, FirstPartyPresencePayload, IdentifyPayload, PingPayload, PongPayload, GreetingsPayload } from "./types";
import { PayloadType } from "./types";
export declare function isPresencePayload(payload: RemotePayload): payload is RemotePresencePayload;
export declare function isFirstPartyPresencePayload(payload: RemotePayload): payload is FirstPartyPresencePayload;
export declare function isIdentifyPayload(payload: RemotePayload): payload is IdentifyPayload;
export declare function isPingPayload(payload: RemotePayload): payload is PingPayload;
export declare function isPongPayload(payload: RemotePayload): payload is PongPayload;
export declare function isGreetingsPayload(payload: RemotePayload): payload is GreetingsPayload;
export declare const PayloadValidators: Record<PayloadType, (payload: RemotePayload) => boolean>;
