"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entities_1 = require("../database/entities");
const security_1 = require("../utils/security");
exports.UserLoader = includeAuth => async (req, res, next) => {
    if (req.cookie('identity')) {
        const user = await entities_1.User.userForToken(req.cookie('identity'));
        if (!includeAuth && !(user instanceof entities_1.User)) {
            return next();
        }
        res.user = await entities_1.User.userForToken(req.cookie('identity'));
    }
    else if (includeAuth && req.getHeader('authorization'))
        res.user = await security_1.SecurityKit.validateApiKey(req.getHeader('authorization'));
    next();
};
