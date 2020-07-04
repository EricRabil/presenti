import bcrypt from "bcrypt";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { CONFIG, saveConfig } from "./config";
import log from "@presenti/logging";
import { User } from "../database/entities";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";

/**
 * Abstraction for generating various API keys for users and services.
 */
export namespace SecurityKit {
  /** Generates the jwt secret if missing */
  async function ensureSecret() {
    if (!CONFIG.crypto.jwtSecret) {
      log.info('Generating JWT secret...');
      CONFIG.crypto.jwtSecret = await bcrypt.genSalt(3);
      await saveConfig();
    }
  }

  /** Generates the first-party signing key if missing */
  async function ensureFirstPartyKey() {
    if (!CONFIG.crypto.firstPartyKey) {
      log.info('Generating first-party key...');
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
        log.debug("Tride to validate API key, but it was expired.");
        return null;
      } else if (e instanceof JsonWebTokenError) {
        log.debug("Tried to validate API key, but encountered a JWT error.", { message: e.message });
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
  export async function token(id: string | User, password: string): Promise<string | null> {
    const user = typeof id === "string" ? await User.findOne({ userID: id }) : id;
    if (!user) return null;

    if (await user.checkPassword(password)) {
      return sign({ uuid: user.uuid }, { expiresIn: "12h" });
    }

    return null;
  }

  /**
   * Generates a first-party API key. First-party API keys have the ability to update any scope.
   */
  export async function firstPartyApiKey(): Promise<string> {
    await ensureFirstPartyKey();

    return sign({ uuid: null, key: await bcrypt.hash(CONFIG.crypto.firstPartyKey!, 3), firstParty: true });
  }

  /**
   * Generates a scoped API key with the given UUID
   * @param uuid UUID
   * @param key user-based secret
   */
  export async function apiKey(uuid: string, key: string) {
    console.log(key);
    return sign({ uuid, key, firstParty: false });
  }

  /**
   * Validates an API key against a user or the first-party rules
   * @param apiKey api to validate
   */
  export async function validateApiKey(apiKey: string) {
    log.debug("Validating API key.");
    const result = await verify(apiKey);
    const { uuid, key, firstParty } = result || {};
    
    if (!key) return (log.debug("API key failed to decode.", { result }), null);

    if (uuid) {
      const user = await User.findOne({ uuid });
    
      if (!user || !await user.checkRawApiKey(key)) return (log.debug(user ? "API key didn't match user's secrets" : "API key didn't return a user"), null);
  
      log.debug("API key validated as user", { uuid });
      return user;
    } else if (firstParty) {
      const isValidFirstParty = await bcrypt.compare(CONFIG.crypto.firstPartyKey!, key);

      if (!isValidFirstParty) return (log.debug("API key didn't match first-party key."), null);

      log.debug("API key validated as first-party.");
      return FIRST_PARTY_SCOPE;
    }

    return null;
  }

  /** Returns the UUID associated with a token, or null */
  export async function validate(token: string): Promise<string | null> {
    return verify(token).then(data => (data || {}).uuid);
  }
}