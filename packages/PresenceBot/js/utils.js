"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
var PresentiKit;
(function (PresentiKit) {
    async function generatePalette(imageURL) {
        const body = await got_1.default(imageURL).buffer();
        const palette = await splashy_1.default(body);
        console.log(imageURL);
        return palette;
    }
    PresentiKit.generatePalette = generatePalette;
})(PresentiKit = exports.PresentiKit || (exports.PresentiKit = {}));
