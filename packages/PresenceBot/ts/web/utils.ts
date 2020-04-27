import cookie from "cookie";
import fs from "fs-extra";
import { STATUS_CODES } from "http";
import mime from "mime-types";
import pug from "pug";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { log } from "../utils";
import body from "./normalizers/body";
import { PBRequest, PBResponse, RequestHandler } from "./types";

export class MiddlewareTimeoutError extends Error { }

const version = require("../../package.json").version;

export function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function wrapRequest(req: HttpRequest, res: PBResponse): PBRequest {
  const newRequest: PBRequest = req as any;

  newRequest.cookie = function (name) {
    if (!this._cookies) this._cookies = cookie.parse(res._reqHeaders['cookie']);
    return this._cookies[name];
  }

  newRequest.getUrl = function () {
    return res._reqUrl;
  }

  newRequest.getQuery = function () {
    return res._reqQuery;
  }

  newRequest.getHeader = function (key) {
    return res._reqHeaders[key as any];
  }

  return newRequest;
}

export const Responses: Record<string, [string, string]> = {
  JSON: ['Content-Type', 'application/json'],
  HTML: ['Content-Type', 'text/html']
}

export function wrapResponse(res: HttpResponse, templateResolver: (file: string) => string = file => file): PBResponse {
  const newResponse: PBResponse = res as any;

  newResponse.render = async function (tpl, options) {
    options = Object.assign({}, options, { user: this.user });
    res.writeHeader(...Responses.HTML).end(pug.renderFile(templateResolver(tpl), options!));
  };

  newResponse.json = async function (json) {
    res.writeHeader(...Responses.JSON).end(JSON.stringify(json));
  }

  newResponse.redirect = function (location) {
    this.writeStatus(302);
    this.writeHeader('Location', location);
    this.end();
  }

  newResponse.file = async function (file) {
    const stream = fs.createReadStream(file);
    const type = mime.lookup(file);

    await new Promise(async (resolve, reject) => {
      if (!type)
        throw new Error(`Failed to resolve MIME type for file: ${file}`);

      res.writeHeader('Content-Type', type);
      const totalSize = await fs.stat(file).then(stat => stat.size);
      stream.on('data', (chunk) => {
        /* We only take standard V8 units of data */
        const buffer = toArrayBuffer((chunk as Buffer));
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
      log.info(`Sent file ${file} to client`)
    })

    stream.destroy();
  }

  newResponse.setCookie = function (name, value, options) {
    this.cookieWrites = this.cookieWrites || {};
    this.cookieWrites[name] = cookie.serialize(name, value, options);
    return this;
  }

  newResponse.clearCookie = function (name) {
    this.cookieWrites = this.cookieWrites || {};
    this.cookieWrites[name] = cookie.serialize(name, '', { maxAge: 0 });
    return this;
  }

  const oldWriteStatus: any = newResponse.writeStatus;

  newResponse.writeStatus = function (status: string | number) {
    this._status = status;
    if (typeof status === "number") status = `${status} ${STATUS_CODES[status]}`
    oldWriteStatus.call(this, status);
    return this;
  }

  const oldEnd = newResponse.end;

  newResponse.end = function (body) {
    if (!this._status) {
      this.writeStatus(200);
    }

    if (this.cookieWrites && Object.keys(this.cookieWrites).length > 0) {
      Object.values(this.cookieWrites).forEach(write => this.writeHeader('Set-Cookie', write));
    }

    this.writeHeader('Server', `presenti/${version}`);
    return oldEnd.call(this, body);
  }

  return newResponse;
}

export async function runMiddleware(req: PBRequest, res: PBResponse, middleware: RequestHandler[]) {
  // load body data
  req.body = await body(req, res);

  for (let fn of middleware) {
    let didComplete = false;
    try {
      const stop: any = await new Promise(async (resolve, reject) => {
        if (middleware.indexOf(fn) !== (middleware.length - 1)) {
          setTimeout(() => {
            if (didComplete) return;
            reject(new MiddlewareTimeoutError('Middleware did not complete within the timeout.'));
          }, 2500);
          await fn(req, res, resolve, reject);
        } else {
          await fn(req, res, () => null, () => null);
          resolve();
        }
      });
      didComplete = true;

      if (stop) {
        return;
      }
    } catch (e) {
      didComplete = true;
      log.error('Failed to process route handling', e);
      return;
    }
  }
}