"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PresentiPresenceBuilder {
    constructor() {
        this.presence = {
            title: null,
            largeText: null,
            smallTexts: [],
            image: null,
            timestamps: {
                start: null,
                end: null
            },
            data: {
                gradient: {
                    priority: null,
                    enabled: false
                }
            }
        };
    }
    toString() {
        return JSON.stringify(this.presence);
    }
    largeText(text, link) {
        this.presence.largeText = { text, link };
        return this;
    }
    smallText(text, link) {
        this.presence.smallTexts.push({ text, link });
        return this;
    }
    image(src, link) {
        this.presence.image = { src, link };
        return this;
    }
    paused(state) {
        this.presence.data.isPaused = state;
    }
    gradient(setting, priority) {
        this.presence.data.gradient = {
            enabled: setting,
            priority
        };
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
}
exports.PresentiPresenceBuilder = PresentiPresenceBuilder;
