"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const v8_1 = __importDefault(require("v8"));
/** Creates an object with a default value for all properties */
function blackHat(defaultValue) {
    const base = v8_1.default.serialize(defaultValue);
    return new Proxy({}, {
        get(target, prop, receiver) {
            if (!target[prop])
                Reflect.set(target, prop, v8_1.default.deserialize(base));
            return Reflect.get(target, prop, receiver);
        }
    });
}
exports.blackHat = blackHat;
