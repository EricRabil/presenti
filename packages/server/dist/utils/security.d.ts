import { User } from "../database/entities";
import { FIRST_PARTY_SCOPE } from "../structs/socket-api-base";
/**
 * Abstraction for generating various API keys for users and services.
 */
export declare namespace SecurityKit {
    /**
     * Tokens cannot be generated without the user ID and password
     * @param id user ID
     * @param password password
     */
    function token(id: string, password: string): Promise<string | null>;
    /**
     * Generates a first-party API key. First-party API keys have the ability to update any scope.
     */
    function firstPartyApiKey(): Promise<string>;
    /**
     * Generates a scoped API key with the given UUID
     * @param uuid UUID
     * @param key user-based secret
     */
    function apiKey(uuid: string, key: string): Promise<string>;
    /**
     * Validates an API key against a user or the first-party rules
     * @param apiKey api to validate
     */
    function validateApiKey(apiKey: string): Promise<typeof FIRST_PARTY_SCOPE | User | null>;
    /** Returns the UUID associated with a token, or null */
    function validate(token: string): Promise<string | null>;
}
