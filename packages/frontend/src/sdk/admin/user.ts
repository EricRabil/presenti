import apiClient from "@/api";
import { USERS_SEARCH, USER_ID, USER_KEY, USER_RESET_PASSWORD, USERS_ATTRS } from "./Constants";
import { PresentiUser } from "@presenti/utils";

export namespace AdminUserSDK {
    export interface SearchParameters {
        query: string;
        sort?: string | [{
            [prop: string]: "asc" | "desc" | "_doc";
        }];
        page?: number;
        max?: number;
    }

    export interface PresentiSearchUser {
        uuid: string;
        userID: string;
        displayName: string;
        createDate: string;
        updateDate: string;
        raw: true;
    }

    export interface UserSearchResult {
        total: number;
        results: PresentiSearchUser[];
    }

    export function searchUsers({ query: q, sort, page, max }: SearchParameters): Promise<UserSearchResult> {
        return apiClient.ajax.get(USERS_SEARCH, {
            params: {
                q,
                s: typeof sort === "string" ? sort : typeof sort === "object" ? Object.keys(sort[0])[0] : undefined,
                d: typeof sort === "object" ? Object.values(sort[0])[0] : undefined,
                p: page || 1,
                l: max
            }
        });
    }

    export function getUser(uuid: string): Promise<PresentiUser> {
        return apiClient.ajax.get(USER_ID(uuid));
    }

    export function editUser(uuid: string, body: Partial<{userID: string, displayName: string | null, attributes: PresentiUser['attributes']}>): Promise<PresentiUser> {
        return apiClient.ajax.patch(USER_ID(uuid), { body });
    }

    export function bulkPatchAttributes(body: { uuids: string[], attributes: PresentiUser["attributes"] }): Promise<{ ok: true }> {
        return apiClient.ajax.patch(USERS_ATTRS, { body });
    }

    export function apiKey(uuid: string): Promise<{ key: string }> {
        return apiClient.ajax.get(USER_KEY(uuid));
    }

    export function deleteUser(uuid: string): Promise<{ ok: true }> {
        return apiClient.ajax.delete(USER_ID(uuid));
    }

    export function resetPassword(uuid: string): Promise<{ ok: true }> {
        return apiClient.ajax.put(USER_RESET_PASSWORD(uuid));
    }
}
