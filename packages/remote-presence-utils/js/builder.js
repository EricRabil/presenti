"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PresenceBuilder {
    constructor() {
        this.presence = {
            title: null,
            largeText: null,
            smallTexts: [],
            image: null,
            timestamps: {
                duration: null,
                position: null
            },
            gradient: {
                priority: null,
                enabled: false
            },
            isPaused: null,
            effective: Date.now()
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
        this.presence.image = src ? { src, link } : null;
        return this;
    }
    paused(state) {
        this.presence.isPaused = state;
        return this;
    }
    gradient(setting, priority) {
        this.presence.gradient = {
            enabled: setting,
            priority
        };
        return this;
    }
    title(title) {
        this.presence.title = title;
        return this;
    }
    duration(duration) {
        this.presence.timestamps.duration = duration;
        return this;
    }
    position(position) {
        this.presence.timestamps.position = position;
        return this;
    }
}
exports.PresenceBuilder = PresenceBuilder;
