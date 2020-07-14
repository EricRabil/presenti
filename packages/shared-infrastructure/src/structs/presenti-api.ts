import { PresentiAPI } from "@presenti/utils/dist/structs/api-spec";
import { PipeDirection, Events, APIError, PresentiUser, PresentiLink, ResolvedPresentiLink, OAUTH_PLATFORM } from "@presenti/utils";
import { UserAPI } from "../api/user";
import { OAuthAPI } from "../api/oauth";
import { NotificationCenter } from "@presenti/modules";

export interface SharedPresentiAPIImplementationOptions {
    notifications: NotificationCenter;
}

export class SharedPresentiAPIImplementation implements PresentiAPI {
    constructor(private options: SharedPresentiAPIImplementationOptions) {}

    async lookupUser(userID: string): Promise<PresentiUser | null> {
        const user = await UserAPI.queryUser({ userID });

        if (!user || user instanceof APIError) return null;
        return user;
    }

    async lookupLink(query: import("@presenti/utils").OAuthQuery): Promise<PresentiLink | null> {
        const link = await OAuthAPI.lookupLink(query);

        if (link instanceof APIError) return null;
        return link;
    }

    async lookupLinksForPlatform(platform: string): Promise<ResolvedPresentiLink[] | null> {
        const links = await OAuthAPI.lookupLinksForPlatform(platform as OAUTH_PLATFORM);

        if (links instanceof APIError) return null;
        return links;
    }

    async lookupUserFromLink(query: import("@presenti/utils").OAuthQuery): Promise<PresentiUser | null> {
        const user = await OAuthAPI.lookupUser(query);
        
        if (user instanceof APIError) return null;
        return user;
    }

    async deleteLink(query: import("@presenti/utils").OAuthQuery): Promise<void> {
        const result = await OAuthAPI.deleteLink(query);

        if (result instanceof APIError) throw result;
    }

    async createLink(data: import("@presenti/utils").OAuthData): Promise<PresentiLink> {
        const link = await OAuthAPI.createLink(data);

        if (link instanceof APIError) throw link;
        return link;
    }

    async updatePipeDirection(query: import("@presenti/utils").OAuthQuery, direction: PipeDirection): Promise<void> {
        const result = await OAuthAPI.updatePipeDirection(query, direction);

        if (result instanceof APIError) throw result;
    }

    async resolveScopeFromUUID(uuid: string): Promise<string | null> {
        const scope = await UserAPI.resolveScopeFromUUID(uuid);

        if (scope instanceof APIError) return null;
        return scope;
    }

    subscribe<T extends Events>(event: T, listener: (data: import("@presenti/utils").EventsTable[T]) => any): void {
        this.options.notifications.addObserver(this.eventNameForCode(event), listener);
    }

    unsubscribe<T extends Events>(event: T, listener: (data: import("@presenti/utils").EventsTable[T]) => any): void {
        this.options.notifications.removeObserver(this.eventNameForCode(event), listener);
    }

    publish<T extends Events>(event: T, data: import("@presenti/utils").EventsTable[T]): void | Promise<void> {
        this.options.notifications.post(this.eventNameForCode(event), data);
    }

    private eventNameForCode(event: Events): string {
        return `presenti.event.${event}`;
    }
}