"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const Configuration_1 = require("./Configuration");
const utils_1 = require("./utils");
const entities_1 = require("./database/entities");
const socket_api_adapter_1 = require("./structs/socket-api-adapter");
var SecurityKit;
(function (SecurityKit) {
    async function ensureSecret() {
        if (!Configuration_1.CONFIG.crypto.jwtSecret) {
            utils_1.log.info('Generating JWT secret...');
            Configuration_1.CONFIG.crypto.jwtSecret = await bcrypt_1.default.genSalt(10);
            await Configuration_1.saveConfig();
        }
    }
    async function ensureFirstPartyKey() {
        if (!Configuration_1.CONFIG.crypto.firstPartyKey) {
            utils_1.log.info('Generating first-party key...');
            Configuration_1.CONFIG.crypto.firstPartyKey = await bcrypt_1.default.genSalt(10);
            await Configuration_1.saveConfig();
        }
    }
    async function sign(data, options = {}) {
        await ensureSecret();
        return new Promise((resolve, reject) => jsonwebtoken_1.default.sign(data, Configuration_1.CONFIG.crypto.jwtSecret, options, (err, token) => err ? reject(err) : resolve(token)));
    }
    async function verify(data) {
        await ensureSecret();
        try {
            return await new Promise((resolve, reject) => jsonwebtoken_1.default.verify(data, Configuration_1.CONFIG.crypto.jwtSecret, (e, dec) => e ? reject(e) : resolve(dec)));
        }
        catch (e) {
            if (e instanceof jsonwebtoken_1.TokenExpiredError) {
                utils_1.log.debug("Tride to validate API key, but it was expired.");
                return null;
            }
            else if (e instanceof jsonwebtoken_1.JsonWebTokenError) {
                utils_1.log.debug("Tried to validate API key, but encountered a JWT error.", e);
                return null;
            }
            throw e;
        }
    }
    /**
     * Tokens cannot be generated without the user ID and password
     * @param id user ID
     * @param password password
     */
    async function token(id, password) {
        const user = await entities_1.User.findOne({ userID: id });
        if (!user)
            return null;
        if (await user.checkPassword(password)) {
            return sign({ uuid: user.uuid }, { expiresIn: "12h" });
        }
        return null;
    }
    SecurityKit.token = token;
    async function firstPartyApiKey() {
        await ensureFirstPartyKey();
        return sign({ uuid: null, key: await bcrypt_1.default.hash(Configuration_1.CONFIG.crypto.firstPartyKey, 10), firstParty: true });
    }
    SecurityKit.firstPartyApiKey = firstPartyApiKey;
    async function apiKey(uuid, key) {
        return sign({ uuid, key, firstParty: false });
    }
    SecurityKit.apiKey = apiKey;
    async function validateApiKey(apiKey) {
        utils_1.log.debug("Validating API key.");
        const result = await verify(apiKey);
        const { uuid, key, firstParty } = result || {};
        if (!key)
            return (utils_1.log.debug("API key failed to decode.", { result }), null);
        if (uuid) {
            const user = await entities_1.User.findOne({ uuid });
            if (!user || !await user.checkRawApiKey(key))
                return (utils_1.log.debug(user ? "API key didn't match user's secrets" : "API key didn't return a user"), null);
            utils_1.log.debug("API key validated as user", { uuid });
            return user;
        }
        else if (firstParty) {
            const isValidFirstParty = await bcrypt_1.default.compare(Configuration_1.CONFIG.crypto.firstPartyKey, key);
            if (!isValidFirstParty)
                return (utils_1.log.debug("API key didn't match first-party key."), null);
            utils_1.log.debug("API key validated as first-party.");
            return socket_api_adapter_1.FIRST_PARTY_SCOPE;
        }
        return null;
    }
    SecurityKit.validateApiKey = validateApiKey;
    async function validate(token) {
        return verify(token).then(data => (data || {}).uuid);
    }
    SecurityKit.validate = validate;
})(SecurityKit = exports.SecurityKit || (exports.SecurityKit = {}));
