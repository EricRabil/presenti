import cookie from "cookie";
import fs from "fs-extra";
import { STATUS_CODES } from "http";
import mime from "mime-types";
import pug from "pug";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { log } from "../logging";
import body from "./normalizers/body";
import { PBRequest, PBResponse, RequestHandler, HTTPMethod } from "./types";
import params from "./normalizers/params";
import { CONFIG } from "../config";

const { version } = require("../../../package.json");

export class MiddlewareTimeoutError extends Error { }

/** Metadata for a Route */
export interface RouteData {
  /** absolute path for the route */
  path: string;
  /** request method for the route */
  method: HTTPMethod;
  /** property on the class that represents the route */
  property: string;
  /** any middleware to be called before handler execution */
  middleware: RequestHandler[];
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/** Headers for common responses */
export const Responses: Record<string, [string, string]> = {
  JSON: ['Content-Type', 'application/json'],
  HTML: ['Content-Type', 'text/html']
}

/** Adds functions to an HttpRequest to meet the PBRequest specification */
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

/** Adds functions to an HttpResponse to meet the PBResponse specification */
export function wrapResponse(res: HttpResponse, templateResolver: (file: string) => string = file => file): PBResponse {
  const newResponse: PBResponse = res as any;

  /** Renders a template */
  newResponse.render = function (tpl, options) {
    options = Object.assign({}, options, { user: this.user, config: CONFIG });
    res.writeHeader(...Responses.HTML).end(pug.renderFile(templateResolver(tpl), options!));
  };

  /** Sends JSON as the response */
  newResponse.json = function (json) {
    if (json instanceof APIError) return this.error(json);
    res.writeHeader(...Responses.JSON).end(JSON.stringify(json));
  }

  /** Redirect the user */
  newResponse.redirect = function (location) {
    this.writeStatus(302);
    this.writeHeader('Location', location);
    this.end();
  }

  /** Serve a file to the user */
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

  /** Add a cookie to be set when the request ends */
  newResponse.setCookie = function (name, value, options) {
    this.cookieWrites = this.cookieWrites || {};
    this.cookieWrites[name] = cookie.serialize(name, value, options);
    return this;
  }

  /** Remove a cookie from the list of cookies to be sent */
  newResponse.clearCookie = function (name) {
    this.cookieWrites = this.cookieWrites || {};
    this.cookieWrites[name] = cookie.serialize(name, '', { maxAge: 0 });
    return this;
  }

  const oldWriteStatus: any = newResponse.writeStatus;

  /** Maps status numbers to their fully-qualified strings to meet uWS requirements */
  newResponse.writeStatus = newResponse.status = function (status: string | number) {
    this._status = status;
    if (typeof status === "number") status = `${status} ${STATUS_CODES[status]}`
    oldWriteStatus.call(this, status);
    return this;
  }

  /** Shorthand for returning an API error */
  newResponse.error = function(error: string | APIError, code: number = 400) {
    if (error instanceof APIError) {
      return this.status(error.httpCode).json(error.json);
    }
    return this.status(code).json({ error });
  }

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
  }

  return newResponse;
}

/**
 * Structure for API-related errors, to be serialized/handled in whatever context needed
 */
export class APIError {
  constructor(public message: string, public code: number = 400) {}

  public get json() {
    return {
      error: this.message,
      code: this.code
    }
  }

  public get httpCode() {
    const httpMessage = STATUS_CODES[this.code];
    if (!httpMessage) return this.code.toString();
    return `${this.code} ${STATUS_CODES[this.code]}`;
  }

  public static notFound(message: string = "Unknown resource.") {
    return new APIError(message, 404);
  }

  public static badRequest(message: string = "Bad request.") {
    return new APIError(message, 400);
  }

  public static internal(message: string = "Internal error.") {
    return new APIError(message, 500);
  }

  public static timeout(message: string = "Service timeout.") {
    return new APIError(message, 502);
  }
}

/**
 * Runs a stack of middleware with the given request and response
 * @param req request object
 * @param res response object
 * @param middleware middleware stack
 */
export async function runMiddleware(metadata: RouteData, req: PBRequest, res: PBResponse, middleware: RequestHandler[]) {
  // load body data
  const parameters = params(req, metadata.path);
  req.body = await body(req, res);
  req.getParameter = (index: number) => parameters[index];

  for (let fn of middleware) {
    let didComplete = false;
    try {
      const stop: any = await new Promise(async (resolve, reject) => {
        if (middleware.indexOf(fn) !== (middleware.length - 1)) {
          /** Halts execution if a middleware takes longer than 2.5s */
          setTimeout(() => {
            if (didComplete) return;
            res.writeStatus(502).json({ error: "Execution timeout." });
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