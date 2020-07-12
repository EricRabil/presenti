import AuthClient, { UserCreationOptions } from "@presenti/auth-client";
import { CONFIG } from "./config";

/**
 * Abstraction for generating various API keys for users and services.
 */
export const SecurityKit = new AuthClient({
  host: CONFIG.auth.host,
  ajax: {
    port: CONFIG.auth.port
  }
});