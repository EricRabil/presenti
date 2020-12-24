import { Module, ModuleOptions, Listener } from "@presenti/modules";
import { createConnection, getConnection, Connection } from "typeorm";
import { PrivateSpotifyAdapter } from "./adapter";
import { SpotifyLinkAPI } from "./api";
import SpotifyModuleStorage from "./entity";
import { OAUTH_PLATFORM, Events, LinkEvent, PipeDirection, OAuthModuleDefinition } from "@presenti/utils";
import { AnalysisCache, MetadataCache } from "./SpotifyCache";
import { AsyncAnalysisCache } from "sactivity";

const DATABASE_NAME = process.env.SPOTIFY_DATABASE_NAME || "PresentiSpotifyModule";

class SpotifyModule extends Module<any> {
    spotifyAdapter: PrivateSpotifyAdapter;
    spotifyLinkAPI: SpotifyLinkAPI;
    connection: Connection;

    static get OAuth(): OAuthModuleDefinition[] {
        return [{
            asset: "spotify",
            key: OAUTH_PLATFORM.SPOTIFY_INTERNAL,
            name: "Spotify (Internal)",
            link: "/api/spotify/link",
            unlink: "/api/spotify/unlink",
            schema: {
                type: "entry",
                contentsVisible: false
            }
        }];
    }

    constructor(options: ModuleOptions<any>) {
        super(options);


        this.registerAdapter(this.spotifyAdapter = new PrivateSpotifyAdapter(options.api, {
            resolve: id => AnalysisCache.findOne({ id }).then(c => c?.result),
            resolveMany: ids => AnalysisCache.findByIds(ids).then(results => results.reduce((acc, { id, result }) => Object.assign(acc, { [id]: result }), {})),
            resolveMetadata: id => MetadataCache.findOne({ id }).then(c => c?.track),
            resolveManyMetadatas: ids => MetadataCache.findByIds(ids).then(results => results.reduce((acc, { id, track }) => Object.assign(acc, { [id]: track }), {})),
            store: (id, result) => AnalysisCache.create({ id, result }).save().then(() => undefined),
            storeMetadata: (id, track) => MetadataCache.create({ id, track }).save().then(() => undefined),
            storeManyMetadatas: metas => MetadataCache.save(Object.entries(metas).map(([ id, track ]) => MetadataCache.create({ id, track }))).then(() => undefined)
        }));

        this.spotifyLinkAPI = new SpotifyLinkAPI(options.app, options.api);
    }

    @Listener(Events.LINK_CREATE)
    async linkCreated(link: LinkEvent) {
        if (link.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
        if (link.pipeDirection !== PipeDirection.PRESENTI && link.pipeDirection !== PipeDirection.BIDIRECTIONAL) return;
        const scope = await this.api.resolveScopeFromUUID(link.userUUID);
        if (!scope) return;

        this.spotifyAdapter.deregisterScope(scope);
        this.spotifyAdapter.registerScope(scope, link.platformID);
    }

    @Listener(Events.LINK_UPDATE)
    async linkUpdated(link: LinkEvent) {
        if (link.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
        const scope = await this.api.resolveScopeFromUUID(link.userUUID);
        if (!scope) return;
  
        this.spotifyAdapter.deregisterScope(scope);
        if (link.pipeDirection === PipeDirection.PRESENTI || link.pipeDirection === PipeDirection.BIDIRECTIONAL) this.spotifyAdapter.registerScope(scope, link.platformID);
    }

    @Listener(Events.LINK_REMOVE)
    async linkRemoved(link: LinkEvent) {
        if (link.platform !== OAUTH_PLATFORM.SPOTIFY_INTERNAL) return;
        const scope = await this.api.resolveScopeFromUUID(link.userUUID);
        console.log(scope);
        if (!scope) return;

        this.spotifyAdapter.deregisterScope(scope);
    }

    async run() {
        this.connection = await this.connectionForDatabase(DATABASE_NAME, [AnalysisCache, MetadataCache, SpotifyModuleStorage]);

        this.spotifyLinkAPI.run();

        super.run();
    }
}

export = SpotifyModule;