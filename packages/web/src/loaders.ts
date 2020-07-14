import { RequestHandler } from "./utils";
import { SharedPresentiWebController } from "./structs/rest-api-base";
import AuthClient from "@presenti/auth-client";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";

export const ServerLoader: RequestHandler = (req, res, next) => {
    req.server = SharedPresentiWebController.server;
    next();
}

/**
 * Loads a User object into the response variable, using the identity cookie, or the authorization header if specified
 * @param includeAuth should the authorization header be used to determine identity?
 */
export const UserLoader: (includeAuthorization?: boolean) => RequestHandler = includeAuth => async (req, res, next) => {
    const identity = req.cookie('identity'), authorization = (includeAuth ? req.getHeader('authorization') : null);
    if (!identity && !authorization) return next();
    const { user, firstParty } = identity ? { user: await AuthClient.sharedInstance.userForToken(identity), firstParty: false } : authorization ? await AuthClient.sharedInstance.validateApiKey(authorization) : { user: null, firstParty: false };

    if (user) {
        res.user = user;
    } else if (firstParty) {
        res.user = FIRST_PARTY_SCOPE as any;
    }

    next();
}
