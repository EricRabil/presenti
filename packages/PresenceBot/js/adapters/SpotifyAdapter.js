"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sactivity_1 = __importDefault(require("sactivity"));
const adapter_1 = require("../adapter");
const source_1 = __importDefault(require("got/dist/source"));
const splashy_1 = __importDefault(require("splashy"));
const scdn = (tag) => `https://i.scdn.co/image/${tag}`;
/**
 * Presence binding for sactivity
 */
class SpotifyAdapter extends adapter_1.PresenceAdapter {
    constructor(cookies) {
        super();
        this.cookies = cookies;
        this.activitySupervisor = null;
        this.client = null;
        this.state = adapter_1.AdapterState.READY;
        this.palettes = {};
        this._lastTimestamp = '';
        this._reconnectCounter = 0;
    }
    run() {
        return this.rebuild();
    }
    async palette() {
        if (this.palettes[this.trackUID])
            return this.palettes[this.trackUID];
        if (!this.imageURL)
            return [];
        const [, tag] = this.imageURL.split('spotify:');
        const body = await source_1.default(scdn(tag)).buffer();
        const palette = await splashy_1.default(body);
        return this.palettes[this.trackUID] = palette;
    }
    async activity() {
        if (!(this.client.playerState && this.client.playerState.track && this.client.playerState.track.metadata))
            return undefined;
        return this.playing ? {
            name: SpotifyAdapter.NAME,
            type: "LISTENING",
            assets: {
                largeImage: this.imageURL && this.imageURL.replace(':image', ''),
                largeText: this.client.track.metadata.album_title
            },
            state: this.artistName,
            details: this.trackName,
            timestamps: {
                start: new Date(this.start),
                end: new Date(this.end)
            },
            ['data']: {
                palette: await this.palette(),
                artwork: this.imageURL && scdn(this.imageURL.split('spotify:')[1])
            },
            ['syncID']: this.client.track.uri.split(':track:')[1]
        } : undefined;
    }
    get start() {
        return parseInt(this.client.playerState.timestamp);
    }
    get end() {
        return this.start + parseInt(this.track.duration);
    }
    get playing() {
        return this.client.playerState && (this.client.playerState.is_playing && !this.client.playerState.is_paused);
    }
    get imageURL() {
        var _a;
        return (_a = (this.client.track.metadata.image_xlarge_url || this.client.track.metadata.image_large_url || this.client.track.metadata.image_url || this.client.track.metadata.image_small_url)) === null || _a === void 0 ? void 0 : _a.replace(':image', '');
    }
    get artistName() {
        return this.client.track.metadata.artist_name || this.client.track.metadata.album_artist_name;
    }
    get track() {
        return this.client.track.metadata;
    }
    get trackUID() {
        return this.client.playerState.track.uid;
    }
    get trackName() {
        return this.track.title;
    }
    get albumName() {
        return this.client.track.metadata.album_title;
    }
    rebuild() {
        this.rebuildActivitySupervisor();
        return this.rebuildSpotifyClient();
    }
    rebuildActivitySupervisor() {
        this.activitySupervisor = new sactivity_1.default(this.cookies);
    }
    async dispatch() {
        if (this.client.playerState.timestamp === this._lastTimestamp)
            return;
        this._lastTimestamp = this.client.playerState.timestamp;
        this.emit("presence");
    }
    async rebuildSpotifyClient() {
        this.client = await this.activitySupervisor.connect();
        this.client.on("close", () => {
            if (this._reconnectCounter >= 5) {
                console.error('Spotify failed to reconnect within the threshold.');
                this.client = null;
                this._reconnectCounter = 0;
                return;
            }
            console.debug('Spotify client did close. Reconnecting in 5 seconds.');
            this._reconnectCounter++;
            setTimeout(() => this.rebuildSpotifyClient(), 5000);
        });
        const broadcast = this.dispatch.bind(this);
        this.client.on("playing", broadcast);
        this.client.on("paused", broadcast);
        this.client.on("stopped", broadcast);
        this.client.on("track", broadcast);
        this.state = adapter_1.AdapterState.RUNNING;
    }
}
exports.SpotifyAdapter = SpotifyAdapter;
SpotifyAdapter.NAME = "Spotify";
