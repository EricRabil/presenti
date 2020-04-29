"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_1 = __importDefault(require("cookie"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const http_1 = require("http");
const mime_types_1 = __importDefault(require("mime-types"));
const pug_1 = __importDefault(require("pug"));
const logging_1 = require("../logging");
const body_1 = __importDefault(require("./normalizers/body"));
const params_1 = __importDefault(require("./normalizers/params"));
const config_1 = require("../config");
const { version } = require("../../../package.json");
class MiddlewareTimeoutError extends Error {
}
exports.MiddlewareTimeoutError = MiddlewareTimeoutError;
function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
exports.toArrayBuffer = toArrayBuffer;
exports.Responses = {
    JSON: ['Content-Type', 'application/json'],
    HTML: ['Content-Type', 'text/html']
};
/** Adds functions to an HttpRequest to meet the PBRequest specification */
function wrapRequest(req, res) {
    const newRequest = req;
    newRequest.cookie = function (name) {
        if (!this._cookies)
            this._cookies = cookie_1.default.parse(res._reqHeaders['cookie']);
        return this._cookies[name];
    };
    newRequest.getUrl = function () {
        return res._reqUrl;
    };
    newRequest.getQuery = function () {
        return res._reqQuery;
    };
    newRequest.getHeader = function (key) {
        return res._reqHeaders[key];
    };
    return newRequest;
}
exports.wrapRequest = wrapRequest;
/** Adds functions to an HttpResponse to meet the PBResponse specification */
function wrapResponse(res, templateResolver = file => file) {
    const newResponse = res;
    /** Renders a template */
    newResponse.render = function (tpl, options) {
        options = Object.assign({}, options, { user: this.user, config: config_1.CONFIG });
        res.writeHeader(...exports.Responses.HTML).end(pug_1.default.renderFile(templateResolver(tpl), options));
    };
    /** Sends JSON as the response */
    newResponse.json = function (json) {
        res.writeHeader(...exports.Responses.JSON).end(JSON.stringify(json));
    };
    /** Redirect the user */
    newResponse.redirect = function (location) {
        this.writeStatus(302);
        this.writeHeader('Location', location);
        this.end();
    };
    /** Serve a file to the user */
    newResponse.file = async function (file) {
        const stream = fs_extra_1.default.createReadStream(file);
        const type = mime_types_1.default.lookup(file);
        await new Promise(async (resolve, reject) => {
            if (!type)
                throw new Error(`Failed to resolve MIME type for file: ${file}`);
            res.writeHeader('Content-Type', type);
            const totalSize = await fs_extra_1.default.stat(file).then(stat => stat.size);
            stream.on('data', (chunk) => {
                /* We only take standard V8 units of data */
                const buffer = toArrayBuffer(chunk);
                /* Store where we are, globally, in our response */
                let offset = res.getWriteOffset();
                /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
                let [ok, done] = res.tryEnd(buffer, totalSize);
                if (done) {
                    resolve();
                }
                else if (!ok) {
                    /* Pause stream while we wait for resume */
                    stream.pause();
                    res.lastBuffer = buffer;
                    res.lastOffset = offset;
                    res.onWritable((offset_1) => {
                        let [ok, done] = res.tryEnd(res.lastBuffer.slice(offset_1 - res.lastOffset), totalSize);
                        if (done) {
                            /* Pipe complete */
                            resolve();
                        }
                        else if (ok) {
                            /* Continue sending chunks */
                            stream.resume();
                        }
                        return ok;
                    });
                }
            }).on('error', (e) => {
                stream.destroy();
                reject(e);
            });
        }).then(() => {
            logging_1.log.info(`Sent file ${file} to client`);
        });
        stream.destroy();
    };
    /** Add a cookie to be set when the request ends */
    newResponse.setCookie = function (name, value, options) {
        this.cookieWrites = this.cookieWrites || {};
        this.cookieWrites[name] = cookie_1.default.serialize(name, value, options);
        return this;
    };
    /** Remove a cookie from the list of cookies to be sent */
    newResponse.clearCookie = function (name) {
        this.cookieWrites = this.cookieWrites || {};
        this.cookieWrites[name] = cookie_1.default.serialize(name, '', { maxAge: 0 });
        return this;
    };
    const oldWriteStatus = newResponse.writeStatus;
    /** Maps status numbers to their fully-qualified strings to meet uWS requirements */
    newResponse.writeStatus = newResponse.status = function (status) {
        this._status = status;
        if (typeof status === "number")
            status = `${status} ${http_1.STATUS_CODES[status]}`;
        oldWriteStatus.call(this, status);
        return this;
    };
    newResponse.error = function (error, code = 400) {
        return this.status(code).json({ error });
    };
    const oldEnd = newResponse.end;
    /** Sends cookies that were set, and sets a default status if none was set. */
    newResponse.end = function (body) {
        if (!this._status) {
            this.writeStatus(200);
        }
        if (this.cookieWrites && Object.keys(this.cookieWrites).length > 0) {
            Object.values(this.cookieWrites).forEach(write => this.writeHeader('Set-Cookie', write));
        }
        this.writeHeader('Server', `presenti/${version}`);
        return oldEnd.call(this, body);
    };
    return newResponse;
}
exports.wrapResponse = wrapResponse;
/**
 * Runs a stack of middleware with the given request and response
 * @param req request object
 * @param res response object
 * @param middleware middleware stack
 */
async function runMiddleware(metadata, req, res, middleware) {
    // load body data
    const parameters = params_1.default(req, metadata.path);
    req.body = await body_1.default(req, res);
    req.getParameter = (index) => parameters[index];
    for (let fn of middleware) {
        let didComplete = false;
        try {
            const stop = await new Promise(async (resolve, reject) => {
                if (middleware.indexOf(fn) !== (middleware.length - 1)) {
                    setTimeout(() => {
                        if (didComplete)
                            return;
                        res.writeStatus(502).json({ error: "Execution timeout." });
                        reject(new MiddlewareTimeoutError('Middleware did not complete within the timeout.'));
                    }, 2500);
                    await fn(req, res, resolve, reject);
                }
                else {
                    await fn(req, res, () => null, () => null);
                    resolve();
                }
            });
            didComplete = true;
            if (stop) {
                return;
            }
        }
        catch (e) {
            didComplete = true;
            logging_1.log.error('Failed to process route handling', e);
            return;
        }
    }
}
exports.runMiddleware = runMiddleware;
