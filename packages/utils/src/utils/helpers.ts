import { Events } from "../types";

export function debounce(fn: Function, wait = 1) {
    let timeout: ReturnType<typeof setTimeout> | null;
    return function (...args) {
        if (timeout) return;
        timeout = setTimeout(() => { fn.call(null, ...args); timeout = null; }, wait)
    }
}

export function eventNameForCode(event: Events): string {
    return `presenti.event.${event}`;
}