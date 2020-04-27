"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sactivity_1 = __importDefault(require("sactivity"));
const remote_presence_utils_1 = require("remote-presence-utils");
const source_1 = __importDefault(require("got/dist/source"));
const splashy_1 = __importDefault(require("splashy"));
const scdn = (tag) => `https://i.scdn.co/image/${tag}`;
/**
 * Presence binding for sactivity
 */
class SpotifyAdapter extends remote_presence_utils_1.PresenceAdapter {
    constructor(cookies) {
        super();
        this.cookies = cookies;
        this.activitySupervisor = null;
        this.client = null;
        this.state = remote_presence_utils_1.AdapterState.READY;
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
            return;
        if (!this.track)
            return;
        return new remote_presence_utils_1.PresenceBuilder()
            .title(SpotifyAdapter.NAME)
            .image(this.imageURL ? scdn(this.imageURL.split(':')[1]) : null, this.songLink)
            .largeText(this.trackName, this.songLink)
            .smallText(`by ${this.artist.name}`, this.artist.external_urls.spotify)
            .smallText(`on ${this.albumName}`, this.albumLink)
            .gradient(true)
            .start(this.start)
            .stop(this.stop)
            .paused(!this.playing)
            .id("com.ericrabil.spotify.internal")
            .presence;
    }
    get start() {
        return Date.now() - parseInt(this.client.playerState.position_as_of_timestamp);
    }
    get stop() {
        return this.start + this.track.duration_ms;
    }
    get playing() {
        return this.client.playerState && (this.client.playerState.is_playing && !this.client.playerState.is_paused);
    }
    get imageURL() {
        var _a;
        return (_a = (this.client.shallowTrack.metadata.image_xlarge_url || this.client.shallowTrack.metadata.image_large_url || this.client.shallowTrack.metadata.image_url || this.client.shallowTrack.metadata.image_small_url)) === null || _a === void 0 ? void 0 : _a.replace(':image', '');
    }
    get artist() {
        return this.client.track.artists[0];
    }
    get track() {
        return this.client.track;
    }
    get trackUID() {
        return this.client.playerState.track.uid;
    }
    get trackName() {
        return this.track.name;
    }
    get albumName() {
        return this.client.track.album.name;
    }
    get songLink() {
        return this.client.track.external_urls.spotify;
    }
    get albumLink() {
        return this.client.track.album.external_urls.spotify;
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
        this.emit("updated");
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
        this.client.on("resumed", broadcast);
        this.client.on("paused", broadcast);
        this.client.on("stopped", broadcast);
        this.client.on("position", broadcast);
        this.client.on("track", broadcast);
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
}
exports.SpotifyAdapter = SpotifyAdapter;
SpotifyAdapter.NAME = "Listening to Spotify";
