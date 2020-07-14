import { Module, ModuleOptions, Listener } from "@presenti/modules";
import { DiscordAdapterOptions } from "./types";
import { createConnection, Connection, getConnection } from "typeorm";
import { DiscordAdapter } from "./adapter";
import DiscordOAuthAPI from "./api";
import Excludes from "./entity";
import { OAUTH_PLATFORM, Events, LinkEvent, PipeDirection, OAuthModuleDefinition } from "@presenti/utils";

const DATABASE_NAME = process.env.DISCORD_DATABASE_NAME || "PresentiDiscordModule";

class DiscordModule extends Module<DiscordAdapterOptions> {
    connection: Connection;
    oauthAPI: DiscordOAuthAPI;
    adapter: DiscordAdapter;

    static get OAuth(): OAuthModuleDefinition[] {
        return [{
            asset: "discord",
            key: OAUTH_PLATFORM.DISCORD,
            name: "Discord",
            link: "/api/oauth/discord",
            unlink: "/api/oauth/discord/unlink",
            schema: {
                type: "oauth"
            }
        }];
    }

    constructor(options: ModuleOptions<DiscordAdapterOptions>) {
        super(options);

        this.registerAdapter(this.adapter = new DiscordAdapter(options.config, options.api));
        this.oauthAPI = new DiscordOAuthAPI(this.app, this.api, this.config);
    }

    async run() {
        this.connection = await this.connectionForDatabase(DATABASE_NAME, [Excludes]);

        this.oauthAPI.run();
    }

    @Listener(Events.LINK_CREATE)
    async linkCreated(link: LinkEvent) {
        if (link.platform !== OAUTH_PLATFORM.DISCORD) return;
        if (link.pipeDirection === PipeDirection.PRESENTI || link.pipeDirection === PipeDirection.BIDIRECTIONAL) {
            const scope = await this.api.resolveScopeFromUUID(link.userUUID);
            if (!scope) return;

            this.adapter.pipeLedger[link.platformID] = scope;
            this.adapter.emit("updated", scope);
        }
    }

    @Listener(Events.LINK_UPDATE)
    async linkUpdated(link: LinkEvent) {
        if (link.platform !== OAUTH_PLATFORM.DISCORD) return;
        if (link.pipeDirection === PipeDirection.PRESENTI || link.pipeDirection === PipeDirection.BIDIRECTIONAL) {
            const scope = await this.api.resolveScopeFromUUID(link.userUUID);
            if (!scope) return;

            this.adapter.pipeLedger[link.platformID] = scope;
            this.adapter.emit("updated", scope);
        } else if (link.pipeDirection === PipeDirection.PLATFORM || link.pipeDirection === PipeDirection.NOWHERE) {
            const scope = this.adapter.pipeLedger[link.platformID];
            if (!scope) return;
            this.adapter.pipeLedger[link.platformID] = undefined!;

            this.adapter.emit("updated", scope);
        }
    }

    @Listener(Events.LINK_REMOVE)
    async linkRemoved(link: LinkEvent) {
        if (link.platform !== OAUTH_PLATFORM.DISCORD) return;
        const scope = this.adapter.pipeLedger[link.platformID];
        if (!scope) return;

        this.adapter.pipeLedger[link.platformID] = undefined!;
        this.adapter.emit("updated", scope);
    }
}

export = DiscordModule;