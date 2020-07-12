import { PresenceProvider } from "@presenti/modules";
import { PresenceCacheBuilder, StateCacheBuilder } from "@presenti/core-cache";

export interface DetachedPresenceProvider extends PresenceProvider {
    presences: ReturnType<typeof PresenceCacheBuilder>;
    states: ReturnType<typeof StateCacheBuilder>;
}