import { PresenceProvider } from "@presenti/modules";
import { PresenceCacheBuilder, StateCacheBuilder } from "@presenti/core-cache";

export interface DecentralizedPresenceProvider extends PresenceProvider {
    presences: ReturnType<typeof PresenceCacheBuilder>;
    states: ReturnType<typeof StateCacheBuilder>;
}