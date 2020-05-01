import RemoteClient from "remote-presence-connector";
import { Evented, Presence, PresenceStruct } from "remote-presence-utils";
import "chrome-extension-async/execute-async-function";
import { extractYouTube, extractNetflix } from "./presence-extractors";
import { debounce } from "./util";
import moment = require("moment");

/**
 * onCreated
 * onUpdated
 * onRemoved
 * onReplaced
 */

enum WatchedHost {
    YouTube = "youtube.com",
    Netflix = "netflix.com"
}

const ACCEPTED_HOSTS = Object.keys(WatchedHost).map(hostName => WatchedHost[hostName]);

/**
 * Determine whether the current tab url is a watched URL (should we send the activity in this tab to the presence API?)
 * @param tab 
 */
function shouldWatchTab(tab: chrome.tabs.Tab) {
    return !!resolveWatchedTab(tab);
}

function resolveWatchedTab(tab: chrome.tabs.Tab): WatchedHost | null {
    try {
        let { host } = new URL(tab.url);
        if (host.startsWith('www.')) host = host.substring(4);
        return ACCEPTED_HOSTS.find(acceptedHost => acceptedHost === host);
    } catch {
        return null;
    }
}

async function presenceForTab(tab: chrome.tabs.Tab): Promise<Presence> {
    const host = resolveWatchedTab(tab);
    let extractor: Function;
    switch (host) {
        case WatchedHost.YouTube:
            extractor = extractYouTube;
            break;
        case WatchedHost.Netflix:
            extractor = extractNetflix;
            break;
        default:
            extractor = () => null;
    }
    return (await chrome.tabs.executeAsyncFunction(tab.id, extractor as any));
}

function tab(id: number): Promise<chrome.tabs.Tab> {
    return new Promise(resolve => chrome.tabs.get(id, resolve));
}

class TabWatcher extends Evented {
    tabs: Record<number, Presence> = {};

    constructor() {
        super();
        chrome.tabs.onCreated.addListener(this.tabCreated.bind(this));
        chrome.tabs.onUpdated.addListener(this.tabUpdated.bind(this));
        chrome.tabs.onRemoved.addListener(this.tabRemoved.bind(this));
        chrome.tabs.onReplaced.addListener(this.tabReplaced.bind(this));
    }

    poll() {
        chrome.tabs.query({}, tabs => {
            tabs.forEach(tab => this.tabUpdated(tab.id));
        });
    }

    tabCreated(tab: chrome.tabs.Tab) {

    }

    async tabUpdated(tabID: number) {
        const tab: chrome.tabs.Tab = await new Promise(resolve => chrome.tabs.get(tabID, resolve));
        const watched = shouldWatchTab(tab);

        if (!watched && this.tabs[tabID]) {
            await this.untrackTab(tabID);
        } else if (watched) {
            await this.trackTab(tabID);
        }
    }

    get presence(): PresenceStruct[] {
        return (Object.keys(this.tabs).map(key => this.tabs[key]).reduce((a,c) => a.concat(c), []).filter(p => !!p) as PresenceStruct[]).map(struct => {
            struct.timestamps.start = moment(struct.timestamps.start).milliseconds(0).toISOString();
            struct.timestamps.end = moment(struct.timestamps.end).milliseconds(0).toISOString();
            return struct;
        });
    }

    tabRemoved(tab: number) {
        this.untrackTab(tab);
    }

    tabReplaced(tab: chrome.tabs.Tab) {
        console.log('replaced', { tab });
    }

    private async trackTab(tabID: number) {
        this.tabs[tabID] = await presenceForTab(await tab(tabID));
        this.emit("change");
    }

    private untrackTab(tabID: number) {
        if (!this.tabs[tabID]) return;
        delete this.tabs[tabID];
        this.emit("change");
    }
}

class PresentiBackground {
    private _token: string;
    private _endpoint: string;
    private _lastPresence: string;
    client: RemoteClient;
    tabs: TabWatcher;

    constructor() {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            for (let key in changes) {
                const { newValue: value } = changes[key];
                switch (key) {
                    case "token":
                    case "endpoint":
                        this[key] = value;
                        break;
                }
            }
        });

        chrome.storage.sync.get({
            remoteEndpoint: 'ws://127.0.0.1:8138/remote',
            remoteToken: null
        }, ({ remoteEndpoint, remoteToken }) => {
            this._token = remoteToken;
            this._endpoint = remoteEndpoint;
            this.run();
        });

        this.tabs = new TabWatcher();

        this.tabs.on("change", debounce(() => {
            const presence = this.tabs.presence;
            const presenceToken = JSON.stringify(presence);
            if (this._lastPresence == presenceToken) return;
            this._lastPresence = presenceToken;
            this.client.presence(presence);
        }, 500));
    }

    get token() {
        return this._token;
    }

    set token(token) {
        this._token = token;
        this.run();
    }

    get endpoint() {
        return this._endpoint;
    }

    set endpoint(endpoint) {
        this._endpoint = endpoint;
        this.run();
    }

    close() {
        if (this.client) {
            this.client.close();
        }
        this.client = null!;
    }

    run() {
        this.close();
        this.build();

        console.log('Presenti is running.');
    }

    build() {
        if (!this.token) return;
        if (!this.endpoint) return;

        this.client = new RemoteClient({
            token: this.token,
            url: this.endpoint,
            reconnect: false
        });

        this.client.on("ready", () => {
            console.log('Established a connection to the server.');
            this.tabs.poll();
        });

        this.client.on("close", () => {
            console.warn('Client closed!! Reconnecting in 2500ms');
            setTimeout(() => this.run(), 2500);
        });

        this.client.run();
    }
}

const backgrounder = new PresentiBackground();
const poller = debounce(backgrounder.tabs.poll.bind(backgrounder.tabs), 250);
chrome.runtime.onMessage.addListener(request => {
    if (request.message === "presenti:poll") {
        poller();
    }
});