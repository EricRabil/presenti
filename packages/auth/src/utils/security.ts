import bcrypt from "bcrypt";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { CONFIG, saveConfig } from "./config";
import logger from "@presenti/logging";
import { FIRST_PARTY_SCOPE, PresentiUser } from "@presenti/utils";
import { IndexedEntity, User } from "@presenti/shared-db";
import { APIError } from "@presenti/utils";

export namespace UserSecurity {
    async function userEntityForToken(token: string) {
        const uuid = await SecurityKit.validate(token);
        if (!uuid) throw APIError.notFound("Unknown user.");

        const user = await User.findOne({ uuid });

        if (!user) throw APIError.notFound("Unknown user.");
        if (user.attributes.banned) throw APIError.forbidden(`You are banned for ${user.banMessage}`);
        
        return user;
    }

    /**
     * Looks up a user with the given identity token (used in the frontend)
     * @param token identity token
     */
    export async function userForToken(token: string) {
        return userEntityForToken(token).then(u => u.json(true));
    }

    export async function createUser({ userID, password, email, displayName }: { userID: string, password: string, email: string, displayName: string }) {
        if (await User.count({ userID })) throw APIError.badRequest("A user with that user ID already exists.").fields({ userID: ["A user with that user ID already exists."] });
        if (await User.count({ email })) throw APIError.badRequest("A user with that email already exists.").fields({ email: ["A user with that email already exists."] });

        const user = User.create({ userID, email, displayName });
        await setPassword(user, password);
        await user.save();

        return user.json(true);
    }

    export async function changePassword(uuid: string, { newPassword, password }: { newPassword: string, password: string }) {
        const user = await User.findOne({ uuid });
        if (!user) throw APIError.notFound("Unknown user.");

        if (!(await checkPassword(user, password))) throw APIError.unauthorized("Incorrect password.");

        await setPassword(user, newPassword);

        return { ok: true };
    }

    export async function setPassword(user: User, password: string) {
        user.passwordHash = await bcrypt.hash(password, 10);
    }

    export async function checkPassword(user: User, password: string) {
        return bcrypt.compare(password, user.passwordHash);
    }

    /**
     * These do not require a password, and will be invalidated when the password is changed.
     */
    export async function apiKey(token: string, ignoreAttributes: boolean = false) {
        const user = await userEntityForToken(token);
        if (!ignoreAttributes) {
            if (!user.canUseRemoteAPIs) throw APIError.forbidden("You are not authorized to create API keys.");
            
        }
        
        return { key: await SecurityKit.apiKey(user.uuid, await rawApiKey(user)) };
    }

    /**
     * Raw API key - not useful on its own, can't be used to query for a user.
     */
    export async function rawApiKey(user: User) {
        return await bcrypt.hash(user.passwordHash, 3);
    }

    /**
     * Compares a raw API key against the hash data
     * @param key raw key
     */
    export async function checkRawApiKey(user: User, key: string) {
        if (!user.canUseRemoteAPIs) return false;
        return bcrypt.compare(user.passwordHash, key);
    }
}

/**
 * Abstraction for generating various API keys for users and services.
 */
export namespace SecurityKit {
    /** Generates the jwt secret if missing */
    async function ensureSecret() {
        if (!CONFIG.crypto.jwtSecret) {
            logger.info('Generating JWT secret...');
            CONFIG.crypto.jwtSecret = await bcrypt.genSalt(3);
            await saveConfig();
        }
    }

    /** Generates the first-party signing key if missing */
    async function ensureFirstPartyKey() {
        if (!CONFIG.crypto.firstPartyKey) {
            logger.info('Generating first-party key...');
            CONFIG.crypto.firstPartyKey = await bcrypt.genSalt(3);
            await saveConfig();
        }
    }

    /** Promise-based wrapper for jwt.sign, uses the configured secret. */
    async function sign(data: any, options: jwt.SignOptions = {}): Promise<string> {
        await ensureSecret();

        return new Promise((resolve, reject) => jwt.sign(data, CONFIG.crypto.jwtSecret!, options, (err, token) => err ? reject(err) : resolve(token)));
    }

    /** Promise-based wrapper for jwt.verify, with mixins for catching certain errors. */
    async function verify(data: string): Promise<any> {
        await ensureSecret();

        try {
            return await new Promise((resolve, reject) => jwt.verify(data, CONFIG.crypto.jwtSecret!, (e, dec) => e ? reject(e) : resolve(dec)));
        } catch (e) {
            if (e instanceof TokenExpiredError) {
                logger.debug("Tride to validate API key, but it was expired.");
                return null;
            } else if (e instanceof JsonWebTokenError) {
                logger.debug("Tried to validate API key, but encountered a JWT error.", { message: e.message });
                return null;
            }
            throw e;
        }
    }

    /**
     * Tokens cannot be generated without the user ID and password
     * @param id user ID
     * @param password password
     * @exposed
     */
    export async function token(userID: string, password: string): Promise<{ user: PresentiUser, token: string }> {
        if (typeof userID !== "string" || userID.length === 0) throw APIError.badRequest("Invalid user ID.");
        const user = await User.findOne({ userID });
        if (!user) throw APIError.unauthorized("Invalid credentials.");

        if (user.attributes.banned) throw APIError.forbidden(user.banMessage);

        if (await UserSecurity.checkPassword(user, password)) {
            return {
                user: user.json(true),
                token: await sign({ uuid: user.uuid }, { expiresIn: "12h" })
            };
        }

        throw APIError.unauthorized("Invalid credentials.");
    }

    /**
     * Generates a first-party API key. First-party API keys have the ability to update any scope.
     * @exposed
     */
    export async function firstPartyApiKey(): Promise<string> {
        await ensureFirstPartyKey();

        return sign({ uuid: null, key: await bcrypt.hash(CONFIG.crypto.firstPartyKey!, 3), firstParty: true });
    }

    /**
     * Generates a scoped API key with the given UUID
     * @param uuid UUID
     * @param key user-based secret
     * @private
     */
    export async function apiKey(uuid: string, key: string) {
        return sign({ uuid, key, firstParty: false });
    }

    /**
     * Validates an API key against a user or the first-party rules
     * @param apiKey api to validate
     * @exposed
     */
    export async function validateApiKey(apiKey: string) {
        logger.debug("Validating API key.");
        const result = await verify(apiKey);
        const { uuid, key, firstParty } = result || {};

        if (!key) {
            logger.debug("API key failed to decode.", { result });
            throw APIError.unauthorized("Invalid API key.");
        }

        if (uuid) {
            const user = await User.findOne({ uuid });

            if (!user || !await UserSecurity.checkRawApiKey(user, key)) {
                logger.debug(user ? "API key didn't match user's secrets" : "API key didn't return a user")
                throw APIError.unauthorized("Invalid API key.");
            }

            logger.debug("API key validated as user", { uuid });
            return { user: user.json(true), firstParty: false };
        } else if (firstParty) {
            const isValidFirstParty = await bcrypt.compare(CONFIG.crypto.firstPartyKey!, key);

            if (!isValidFirstParty) return (logger.debug("API key didn't match first-party key."), null);

            logger.debug("API key validated as first-party.");
            return { user: null, firstParty: true };
        } else throw APIError.unauthorized("Invalid API key.");
    }

    /** @private */
    export async function validate(token: string): Promise<string | null> {
        return verify(token).then(data => (data || {}).uuid);
    }
}