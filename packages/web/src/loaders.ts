import { RequestHandler } from "./utils";
import { SharedPresentiWebController } from "./structs/rest-api-base";

export const ServerLoader: RequestHandler = (req, res, next) => {
    req.server = SharedPresentiWebController.server;
    next();
}

export const UserLoader: (includeAuthorization?: boolean) => RequestHandler = auth => (req, res, next) => {
    if (req.server) {
        return req.server.web.loaders.UserLoader(auth)(req, res, next);
    };
    return next();
};
