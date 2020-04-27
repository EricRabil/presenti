"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entities_1 = require("../database/entities");
exports.UserLoader = async (req, res, next) => {
    res.user = await entities_1.User.userForToken(req.cookie('identity'));
    next();
};
