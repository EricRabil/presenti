import { User } from "./database/entities";
import { FIRST_PARTY_SCOPE } from "./structs/socket-api-adapter";
export declare namespace SecurityKit {
    /**
     * Tokens cannot be generated without the user ID and password
     * @param id user ID
     * @param password password
     */
    function token(id: string, password: string): Promise<string | null>;
    function firstPartyApiKey(): Promise<string>;
    function apiKey(uuid: string, key: string): Promise<string>;
    function validateApiKey(apiKey: string): Promise<typeof FIRST_PARTY_SCOPE | User | null>;
    function validate(token: string): Promise<string | null>;
}
