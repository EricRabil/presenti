"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const v8_1 = __importDefault(require("v8"));
/* Helper function for reading a posted JSON body */
function readRequest(res) {
    return new Promise((resolve, reject) => {
        let buffer;
        /* Register data cb */
        res.onData((ab, isLast) => {
            let chunk = Buffer.from(ab);
            if (isLast) {
                let json;
                if (buffer) {
                    try {
                        json = JSON.parse(Buffer.concat([buffer, chunk]).toString());
                    }
                    catch (e) {
                        json = null;
                    }
                    resolve(json);
                }
                else {
                    try {
                        json = JSON.parse(chunk.toString());
                    }
                    catch (e) {
                        json = null;
                    }
                    resolve(json);
                }
            }
            else {
                if (buffer) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                else {
                    buffer = Buffer.concat([chunk]);
                }
            }
        });
        /* Register error cb */
        res.onAborted(reject);
    });
}
exports.readRequest = readRequest;
const got_1 = __importDefault(require("got"));
const splashy_1 = __importDefault(require("splashy"));
const chalk_1 = __importDefault(require("chalk"));
var PresentiKit;
(function (PresentiKit) {
    async function generatePalette(imageURL) {
        const body = await got_1.default(imageURL).buffer();
        const palette = await splashy_1.default(body);
        return palette;
    }
    PresentiKit.generatePalette = generatePalette;
})(PresentiKit = exports.PresentiKit || (exports.PresentiKit = {}));
const logLevels = {
    levels: {
        emerg: 0,
        alert: 1,
        crit: 2,
        error: 3,
        warning: 4,
        notice: 5,
        info: 6,
        debug: 7
    },
    colors: {
        emerg: 'red',
        alert: 'red',
        crit: 'red',
        error: 'red',
        warning: 'yellow',
        notice: 'blue',
        info: 'green',
        debug: 'green'
    }
};
exports.log = winston_1.default.createLogger({
    levels: logLevels.levels,
    transports: [
        new winston_1.default.transports.Console({
            level: 'debug',
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format((info, opts = {}) => {
                if (info.name) {
                    info.level = `${info.level} ${chalk_1.default.magenta(info.name)}`;
                    delete info.name;
                }
                return info;
            })(), winston_1.default.format.simple())
        })
    ]
});
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
