import bcrypt from "bcrypt";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { CONFIG, saveConfig } from "./Configuration";
import { log } from "./utils";
import { User } from "./database/entities";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-adapter";

export namespace SecurityKit {
  async function ensureSecret() {
    if (!CONFIG.crypto.jwtSecret) {
      log.info('Generating JWT secret...');
      CONFIG.crypto.jwtSecret = await bcrypt.genSalt(10);
      await saveConfig();
    }
  }

  async function ensureFirstPartyKey() {
    if (!CONFIG.crypto.firstPartyKey) {
      log.info('Generating first-party key...');
      CONFIG.crypto.firstPartyKey = await bcrypt.genSalt(10);
      await saveConfig();
    }
  }

  async function sign(data: any, options: jwt.SignOptions = {}): Promise<string> {
    await ensureSecret();

    return new Promise((resolve, reject) => jwt.sign(data, CONFIG.crypto.jwtSecret!, options, (err, token) => err ? reject(err) : resolve(token)));
  }

  async function verify(data: string): Promise<any> {
    await ensureSecret();

    try {
      return await new Promise((resolve, reject) => jwt.verify(data, CONFIG.crypto.jwtSecret!, (e, dec) => e ? reject(e) : resolve(dec)));
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        log.debug("Tride to validate API key, but it was expired.");
        return null;
      } else if (e instanceof JsonWebTokenError) {
        log.debug("Tried to validate API key, but encountered a JWT error.", e);
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
  export async function token(id: string, password: string): Promise<string | null> {
    const user = await User.findOne({ userID: id });
    if (!user) return null;

    if (await user.checkPassword(password)) {
      return sign({ uuid: user.uuid }, { expiresIn: "12h" });
    }

    return null;
  }

  export async function firstPartyApiKey(): Promise<string> {
    await ensureFirstPartyKey();

    return sign({ uuid: null, key: await bcrypt.hash(CONFIG.crypto.firstPartyKey!, 10), firstParty: true });
  }

  export async function apiKey(uuid: string, key: string) {
    return sign({ uuid, key, firstParty: false });
  }

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

  export async function validate(token: string): Promise<string | null> {
    return verify(token).then(data => (data || {}).uuid);
  }
}