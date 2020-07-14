import { AdapterState, Presence, PresenceAdapter, PresenceBuilder } from "@presenti/utils";
import Sactivity, { SpotifyClient } from "sactivity";

const scdn = (tag: string) => `https://i.scdn.co/image/${tag}`

export class SpotifyPrivateClient extends PresenceAdapter {
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

  async activity(): Promise<Presence> {
    if (!(this.client.playerState && this.client.playerState.track && this.client.playerState.track.metadata)) return;
    if (!this.track) return;
    return new PresenceBuilder()
                .title(SpotifyPrivateClient.NAME)
                .image(this.imageURL || null, this.songLink)
                .largeText(this.trackName, this.songLink)
                .smallText({ text: `by ${this.artistsMarkdown}`, type: "md" })
                .smallText({ text: `on [${this.albumName}](${this.albumLink})`, type: "md"})
                .gradient(true)
                .start(this.start)
                .stop(this.stop)
                .paused(!this.playing)
                .id("com.ericrabil.spotify.internal")
                .presence
  }

  rebuild() {
    this.rebuildActivitySupervisor();
    return this.rebuildSpotifyClient();
  }

  rebuildActivitySupervisor() {
    this.activitySupervisor = new Sactivity(this.cookies);
  }

  _closed = false;
  close() {
    this._closed = true;
    if (this.client.socket.readyState !== this.client.socket.CLOSED) this.client.socket.close();
  }

  _lastTimestamp = '';
  async dispatch() {
    if (this.client.playerState.timestamp === this._lastTimestamp) return;
    this._lastTimestamp = this.client.playerState.timestamp;
    this.emit("updated");
  }

  _reconnectCounter = 0;
  async rebuildSpotifyClient() {
    this._closed = false;
    this.client = await this.activitySupervisor.connect();

    this.client.on("close", () => {
      if (this._closed) return;
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
    return (this.client.track.images || this.client.track.album?.images)[0].url;
  }

  get artist() {
    return this.client.track.artists[0];
  }

  get artistsMarkdown() {
    return this.client.track.artists.map(artist => `[${artist.name}](${artist.external_urls.spotify})`).join(', ');
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
}