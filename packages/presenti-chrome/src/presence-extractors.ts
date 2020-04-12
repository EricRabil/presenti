import { PresenceStruct } from "remote-presence-utils";

export const extractYouTube = async function(): Promise<PresenceStruct | null> {
  const video: HTMLVideoElement = document.querySelector('video.html5-main-video');
  const title: HTMLElement = document.querySelector('h1.title');
  const channelHolder: HTMLElement = document.querySelector('div.ytd-channel-name');
  const params = new URLSearchParams(location.search);
  const videoID = params.get('v');

  if (!video || !title || !channelHolder || !videoID) return null;
  if (video.paused) {
    const future = await new Promise(resolve => setTimeout(() => {
      resolve(video.paused);
    }, 500));
    if (future) return;
  }

  if (!video.ontimeupdate) {
    video.ontimeupdate = () => chrome.runtime.sendMessage({
      message: "presenti:poll"
    });
  }

  const playlist = document.querySelector('yt-formatted-string.ytd-playlist-panel-renderer');

  const { duration, currentTime } = video;
  const thumbnailURL = `https://img.youtube.com/vi/${videoID}/default.jpg`

  const start = new Date(Date.now() - (currentTime * 1000)).toISOString();
  const end = new Date(Date.now() + ((duration - currentTime) * 1000)).toISOString();

  const channelLink = channelHolder.querySelector('a').href;
  const videoLink = `https://youtu.be/${videoID}`;

  return {
    name: 'YouTube',
    type: "WATCHING" as "WATCHING",
    assets: {
      largeImage: thumbnailURL,
      largeText: title.innerText,
      smallImage: null,
      smallText: channelHolder.innerText
    },
    state: null,
    details: null,
    timestamps: {
      start,
      end
    },
    url: null,
    applicationID: "presenti",
    createdTimestamp: null,
    data: {
      smallTextLink: videoLink,
      largeTextLink: `https://youtu.be/${videoID}`,
      imageLink: videoLink
    }
  }
}

export const extractNetflix = async function(): Promise<PresenceStruct | null> {
  const params = new URLSearchParams(location.search);
  const trackID = params.get('trackId');
  var video = document.querySelector('video');
  var detailsHolder = document.querySelector('.text-control.video-title');

  if (!video || !detailsHolder) {
    if (trackID) {
      await new Promise(resolve => {
        var interval = setInterval(() => {
          if ((video = document.querySelector('video')) && (detailsHolder = document.querySelector('.text-control.video-title'))) {
            clearInterval(interval);
            resolve();
          }
        }, 250);
      })
    } else {
      return null;
    }
  }

  if (video.paused) return null;

  if (!video.ontimeupdate) {
    video.ontimeupdate = () => chrome.runtime.sendMessage({
      message: "presenti:poll"
    });
  }

  const bigDetail = detailsHolder.querySelector('h4');
  const littleDetails = Array.from(detailsHolder.querySelectorAll('span'));
  const titleID = location.pathname.split('/watch/')[1];

  if (!bigDetail || !littleDetails || !littleDetails || !trackID || !titleID) return null;


  const { duration, currentTime } = video;

  const start = new Date(Date.now() - (currentTime * 1000)).toISOString();
  const end = new Date(Date.now() + ((duration * 1000) - (currentTime * 1000))).toISOString();

  return {
    name: 'Netflix',
    type: 'WATCHING' as 'WATCHING',
    assets: {
      largeImage: "https://media.netflix.com/transformCorporateAsset?transformHandle=assetThumbnail732x440&assetId=76035",
      largeText: bigDetail.textContent,
      smallImage: null,
      smallText: littleDetails.map(detail => detail.textContent).join(' ')
    },
    state: null,
    details: null,
    timestamps: {
      start,
      end
    },
    url: null,
    data: {
      largeTextLink: `https://www.netflix.com/watch/${titleID}`,
      smallTextLink: `https://www.netflix.com/watch/${titleID}?trackId=${trackID}`,
      imageLink: 'https://www.netflix.com'
    },
    applicationID: "presenti",
    createdTimestamp: null
  }
}