import Sactivity, { SpotifyClient } from "sactivity";
import { PresenceAdapter, AdapterState } from "../adapter";
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

  static readonly NAME = "Spotify";

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

  async activity(): Promise<Partial<Activity> | undefined> {
    if (!(this.client.playerState && this.client.playerState.track && this.client.playerState.track.metadata)) return undefined;
    if (!this.track) return;
    return this.playing ? {
      name: SpotifyAdapter.NAME,
      type: "LISTENING",
      assets: {
        largeImage: this.imageURL && this.imageURL.replace(':image', ''),
        largeText: this.albumName
      } as any,
      state: null,
      details: this.trackName,
      timestamps: {
        start: new Date(this.start),
        end: new Date(this.end)
      },
      ['data' as any]: {
        palette: await this.palette(),
        artists: this.artists,
        albumLink: this.albumLink,
        songLink: this.songLink,
        artwork: this.imageURL && scdn(this.imageURL.split('spotify:')[1])
      },
      ['syncID' as any]: this.client.track.uri.split(':track:')[1]
    } : undefined;
  }

  get start() {
    return parseInt(this.client.playerState.timestamp);
  }

  get end() {
    return this.start + this.track.duration_ms;
  }

  get playing() {
    return this.client.playerState && (this.client.playerState.is_playing && !this.client.playerState.is_paused);
  }

  get imageURL(): string | undefined {
    return (this.client.shallowTrack.metadata.image_xlarge_url || this.client.shallowTrack.metadata.image_large_url || this.client.shallowTrack.metadata.image_url || this.client.shallowTrack.metadata.image_small_url)?.replace(':image', '');
  }

  get artists() {
    return this.track.artists.map(({ name, external_urls: { spotify: link }}) => ({ name, link }));
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
    this.emit("presence");
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
    this.client.on("paused", broadcast);
    this.client.on("stopped", broadcast);
    this.client.on("track", broadcast);

    this.state = AdapterState.RUNNING;
  }
}