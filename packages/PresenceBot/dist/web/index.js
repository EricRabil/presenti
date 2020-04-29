"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const frontend_1 = __importDefault(require("./frontend"));
const api_1 = __importDefault(require("./api/api"));
const oauth_api_1 = __importDefault(require("./api/oauth-api"));
var WebRoutes;
(function (WebRoutes) {
    var initialized = false;
    /**
     * Binds all API routes to the app
     * @param app uws app
     */
    function initialize(app) {
        if (initialized)
            return;
        const frontend = new frontend_1.default(app);
        const api = new api_1.default(app);
        const oauthAPI = new oauth_api_1.default(app);
        return { frontend, api, oauthAPI };
    }
    WebRoutes.initialize = initialize;
})(WebRoutes = exports.WebRoutes || (exports.WebRoutes = {}));
