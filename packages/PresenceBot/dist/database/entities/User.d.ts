import { BaseEntity } from "typeorm";
import { OAuthLink } from "./OAuthLink";
export declare class User extends BaseEntity {
    uuid: string;
    userID: string;
    passwordHash: string;
    oAuthLinks: OAuthLink[];
    excludes: string[];
    json(full?: boolean): {
        uuid: string;
        userID: string;
        platforms: {} | null;
        excludes: string[];
    };
    get platforms(): {};
    setPassword(password: string): Promise<void>;
    checkPassword(password: string): Promise<boolean>;
    /**
     * Returns a link code that expires after some time
     */
    linkCode(): Promise<string>;
    testLinkCode(code: string): Promise<boolean>;
    /**
     * These require a password because they are used to generate API keys.
     * @param password password
     */
    token(password: string): Promise<string | null>;
    /**
     * These do not require a password, and will be invalidated when the password is changed.
     */
    apiKey(): Promise<string>;
    /**
     * Raw API key - not useful on its own, can't be used to query for a user.
     */
    rawApiKey(): Promise<string>;
    /**
     * Compares a raw API key against the hash data
     * @param key raw key
     */
    checkRawApiKey(key: string): Promise<boolean>;
    /**
     * Looks up a user with the given identity token (used in the frontend)
     * @param token identity token
     */
    static userForToken(token: string): Promise<User | null>;
    static createUser(userID: string, password: string): Promise<User>;
}
