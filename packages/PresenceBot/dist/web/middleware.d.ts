import { RequestHandler } from "../utils/web/types";
/** Returns a 401 if the request is not authenticated */
export declare const IdentityGuard: RequestHandler;
/** Renders an authentication error if the request is not authenticated */
export declare const IdentityGuardFrontend: RequestHandler;
/** Blocks first-party requests to an endpoint */
export declare const DenyFirstPartyGuard: RequestHandler;
/** Only accepts first-party requests to an endpoint */
export declare const FirstPartyGuard: RequestHandler;
