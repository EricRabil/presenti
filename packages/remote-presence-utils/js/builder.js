"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PresentiPresenceBuilder {
    constructor() {
        this.presence = {
            applicationID: null,
            assets: {
                largeImage: null,
                largeText: null,
                smallImage: null,
                smallText: null,
                smallTexts: []
            },
            createdTimestamp: 0,
            details: null,
            name: null,
            state: null,
            timestamps: {
                start: null,
                end: null
            },
            type: 'PLAYING',
            url: null,
            data: {
                largeTextLink: null,
                smallTextLink: null,
                smallTextLinks: [],
                imageLink: null
            }
        };
    }
    toString() {
        return JSON.stringify(this.presence);
    }
    id(id) {
        this.presence.applicationID = id;
        return this;
    }
    largeImage(src, link = this.presence.data.imageLink) {
        this.presence.assets.largeImage = src;
        this.presence.data.imageLink = link;
        return this;
    }
    largeText(text, link = this.presence.data.largeTextLink) {
        this.presence.assets.largeText = text;
        this.presence.data.largeTextLink = link;
        return this;
    }
    text(text, link = null) {
        const index = this.presence.assets.smallTexts.push(text) - 1;
        this.presence.data.smallTextLinks[index] = link;
        return this;
    }
    created(timestamp) {
        this.presence.createdTimestamp = timestamp;
        return this;
    }
    details(details) {
        this.presence.details = details;
        return this;
    }
    name(name) {
        this.presence.name = name;
        return this;
    }
    state(state) {
        this.presence.state = state;
        return this;
    }
    start(time) {
        if (time instanceof Date)
            time = time.toISOString();
        else if (typeof time === "number")
            time = new Date(time).toISOString();
        this.presence.timestamps.start = time;
        return this;
    }
    end(time) {
        if (time instanceof Date)
            time = time.toISOString();
        else if (typeof time === "number")
            time = new Date(time).toISOString();
        this.presence.timestamps.end = time;
        return this;
    }
    type(type) {
        this.presence.type = type;
        return this;
    }
}
exports.PresentiPresenceBuilder = PresentiPresenceBuilder;
