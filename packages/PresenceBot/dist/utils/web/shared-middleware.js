"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring_1 = __importDefault(require("querystring"));
/** Parses raw body content based on the request mime type */
exports.BodyParser = async (req, res, next) => {
    const mime = req.getHeader('content-type');
    const data = req.body;
    switch (mime.split(';')[0]) {
        case 'application/x-www-form-urlencoded': {
            req.body = querystring_1.default.parse(data);
            break;
        }
        case 'application/json': {
            req.body = JSON.parse(data);
            break;
        }
    }
    next();
};
