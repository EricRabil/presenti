import { APIError } from "@presenti/utils";
import cookie from "cookie";
import fs from "fs-extra";
import { STATUS_CODES } from "http";
import mime from "mime-types";
import pug from "pug";
import { HttpResponse } from "uWebSockets.js";
import { PBResponse } from "../types";

/** Headers for common responses */
const Responses: Record<string, [string, string]> = {
    JSON: ['Content-Type', 'application/json'],
    HTML: ['Content-Type', 'text/html']
}
  

function toArrayBuffer(buffer: Buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/** Adds functions to an HttpResponse to meet the PBResponse specification */
export default function extendResponse(res: HttpResponse, templateResolver: (file: string) => string = file => file): PBResponse {
    const newResponse: PBResponse = res as any;
  
    /** Renders a template */
    newResponse.render = function (tpl, options) {
      options = Object.assign({}, options, { user: this.user });
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
      });
  
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
  
    const oldWriteHeader = newResponse.writeHeader;
  
    /** Interoperability function for express */
    newResponse.setHeader = newResponse.writeHeader = function(key, value) {
      if (!this._resHeaders) this._resHeaders = {};
      /** uWS computes content-length, and we can't interfere with her. */
      if (key.toString().toLowerCase() === "content-length") return this;
      this._resHeaders[key as any] = value;
      return this;
    };
  
    /** Interoperability function for express */
    newResponse.getHeader = function(header) {
      if (typeof this._resHeaders !== "object") return;
      return this._resHeaders[header];
    }
  
    const oldWriteStatus: any = newResponse.writeStatus;
  
    /** Maps status numbers to their fully-qualified strings to meet uWS requirements */
    newResponse.writeStatus = newResponse.status = function (status: string | number) {
      if (typeof status === "number") status = `${status} ${STATUS_CODES[status]}`
      this._status = status;
      return this;
    }
  
    Object.defineProperty(newResponse, "statusCode", {
      get() {
        return newResponse._status;
      },
      set(status) {
        newResponse.writeStatus(status);
        return this;
      }
    })
  
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
  
      oldWriteStatus.call(this, this._status);
  
      if (this.cookieWrites && Object.keys(this.cookieWrites).length > 0) {
        Object.values(this.cookieWrites).forEach(write => this.writeHeader('Set-Cookie', write));
      }
  
      for (let [key, value] of Object.entries(this._resHeaders || {})) {
        oldWriteHeader.call(this, key, value as any);
      }
      
      this._ended = true;
      return oldEnd.call(this, body);
    }
  
    return newResponse;
  }
  