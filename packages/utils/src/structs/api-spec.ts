import { EventsTable, Events, PresentiUser, PresentiLink, OAuthQuery, ResolvedPresentiLink, OAuthData, PipeDirection } from "../types";

export interface PresentiAPI {
    /**
   * Query presenti for data related to a scope
   * @param userID scope/user ID
   */
    lookupUser(userID: string): Promise<PresentiUser | null>;
    /**
     * Lookup the link data associated with an OAuth identity
     * @param query query used to lookup the link
     */
    lookupLink(query: OAuthQuery): Promise<PresentiLink | null>;
    /**
     * Lookup the links for the given platform
     * @param platform platform to pull links for
     */
    lookupLinksForPlatform(platform: string): Promise<ResolvedPresentiLink[] | null>;
    /**
     * Lookup the user associated with an OAuth identity
     * @param query query used to lookup the link
     */
    lookupUserFromLink(query: OAuthQuery): Promise<PresentiUser | null>;
    /**
     * Deletes a connection between an OAuth identity and a Presenti user
     * @param query query used to lookup the link
     */
    deleteLink(query: OAuthQuery): Promise<void>;
    /**
     * Establishes a connection between an OAuth identity and a Presenti user
     * @param data data defining the link
     */
    createLink(data: OAuthData): Promise<PresentiLink | null>;
    /**
     * Updates the pipe direction for an oauth profile
     * @param query data associated with an oauth profile
     * @param direction 
     */
    updatePipeDirection(query: OAuthQuery, direction: PipeDirection): Promise<void>;
    /**
     * Resolves the scope of a user given the UUID
     * @param uuid user UUID
     */
    resolveScopeFromUUID(uuid: string): Promise<string | null>;
    /**
     * Subscribe to a Presenti event
     * @param event event code
     * @param listener event handler
     */
    subscribe<T extends Events>(event: T, listener: (data: EventsTable[T]) => any): void;
    /**
     * Unsubscribe from a Presenti event
     * @param event event code
     * @param listener event handler
     */
    unsubscribe<T extends Events>(event: T, listener: (data: EventsTable[T]) => any): void;
    /**
     * Commit an action/message to Presenti
     * @param payload payload to commit
     */
    publish<T extends Events>(event: T, data: EventsTable[T]): void | Promise<void>;
}