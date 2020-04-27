import Sactivity, { SpotifyClient } from "sactivity";
import { PresenceAdapter, AdapterState, PresenceStruct, PresenceBuilder, Presence } from "remote-presence-utils";
import { Activity } from "discord.js";
import got from "got/dist/source";
import splashy from "splashy";

const scdn = (tag: string) => `https://i.scdn.co/image/${tag}`

/**
 * Presence binding for sactivity
 */
export class SpotifyAdapter extends PresenceAdapter {
  activitySupervisor: Sactivity = null!;
  client: SpotifyClient = null!;
  state: AdapterState = AdapterState.READY;

  static readonly NAME = "Listening to Spotify";

  constructor(public readonly cookies: string) {
    super();
  }

  run() {
    return this.rebuild();
  }

  palettes: Record<string, string[]> = {};

  async palette(): Promise<string[]> {
    if (this.palettes[this.trackUID]) return this.palettes[this.trackUID];
    if (!this.imageURL) return [];
    const [, tag] = this.imageURL.split('spotify:');
    const body = await got(scdn(tag)).buffer();
    const palette = await splashy(body);
    return this.palettes[this.trackUID] = palette;
  }

  async activity(): Promise<Presence> {
    if (!(this.client.playerState && this.client.playerState.track && this.client.playerState.track.metadata)) return;
    if (!this.track) return;
    return new PresenceBuilder()
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
                .presence
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

  get imageURL(): string | undefined {
    return (this.client.shallowTrack.metadata.image_xlarge_url || this.client.shallowTrack.metadata.image_large_url || this.client.shallowTrack.metadata.image_url || this.client.shallowTrack.metadata.image_small_url)?.replace(':image', '');
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
    this.activitySupervisor = new Sactivity(this.cookies);
  }

  _lastTimestamp = '';
  async dispatch() {
    if (this.client.playerState.timestamp === this._lastTimestamp) return;
    this._lastTimestamp = this.client.playerState.timestamp;
    this.emit("updated");
  }

  _reconnectCounter = 0;
  async rebuildSpotifyClient() {
    this.client = await this.activitySupervisor.connect();

    this.client.on("close", () => {
      if (this._reconnectCounter >= 5) {
        console.error('Spotify failed to reconnect within the threshold.');
        this.client = null!;
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

    this.state = AdapterState.RUNNING;
  }
}