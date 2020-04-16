"use strict";
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
