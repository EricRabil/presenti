"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const deep_equal_1 = __importDefault(require("deep-equal"));
const logging_1 = require("./logging");
/** A series of proxy builders that emit "updated" events when their contents are changed */
var PresenceMagic;
(function (PresenceMagic) {
    const log = logging_1.log.child({ name: "PresenceMagic" });
    /**
     * Returns an array that will emit a changed event if the contents of it are changed.
     * @param evented event listener
     * @param scope
     */
    function createArrayProxy(changed) {
        return new Proxy([], {
            set(target, prop, value, receiver) {
                const oldExisted = !!target[prop];
                const result = Reflect.set(target, prop, value, receiver);
                if (!result)
                    return result;
                if (!isNaN(+prop) && (oldExisted || value)) {
                    // check for changes. if there was a change, emit it.
                    if (!deep_equal_1.default(target[prop], value)) {
                        changed();
                    }
                }
                return result;
            },
            deleteProperty(target, prop) {
                const oldExisted = !!target[prop];
                const result = Reflect.deleteProperty(target, prop);
                if (!result)
                    return result;
                if (oldExisted)
                    changed();
                return true;
            }
        });
    }
    PresenceMagic.createArrayProxy = createArrayProxy;
    /**
     * Returns a dictionary of presence arrays, and emits a changed event if the contents of it are changed.
     * @param evented
     */
    function createPresenceProxy(changed) {
        return new Proxy({}, {
            get(target, prop, receiver) {
                if (!target[prop]) {
                    Reflect.set(target, prop, createArrayProxy(() => changed(prop)));
                }
                return target[prop];
            },
            set(target, prop, value, receiver) {
                const oldExisted = !!target[prop];
                const result = Reflect.set(target, prop, value, receiver);
                if (!result)
                    return result;
                if (Array.isArray(value) ? value.length === 0 : !value)
                    return this.deleteProperty(target, prop);
                if (oldExisted || value) {
                    log.debug("Presence updated for scope", { scope: prop });
                    changed(prop);
                }
                return result;
            },
            deleteProperty(target, prop) {
                const result = Reflect.deleteProperty(target, prop);
                if (!result)
                    return result;
                changed(prop);
                return true;
            }
        });
    }
    PresenceMagic.createPresenceProxy = createPresenceProxy;
    function createPresenceDictCondenser(ledger) {
        return new Proxy(ledger, {
            get(target, prop, receiver) {
                return Object.values(target)
                    .map(p => p[prop])
                    .filter(p => !!p)
                    .reduce((a, c) => a.concat(c), [])
                    .filter(({ id }, i, a) => !id ? true : (a.findIndex(p => p.id === id) === i)) || [];
            },
            set(target, prop, value, receiver) {
                return false;
            },
            deleteProperty(target, prop) {
                return false;
            }
        });
    }
    PresenceMagic.createPresenceDictCondenser = createPresenceDictCondenser;
})(PresenceMagic = exports.PresenceMagic || (exports.PresenceMagic = {}));
