/**
 * Source: https://raw.githubusercontent.com/nanoexpress/nanoexpress/master/src/normalizers/body.js
 */

import { Readable } from 'stream';
import { PBRequest, PBResponse } from '../types';

export default async function BodyNormalizer (req: PBRequest, res: PBResponse) {
  const stream = new Readable();
  stream._read = () => true;
  req.pipe = stream.pipe.bind(stream);
  req.stream = stream;

  if (!res || !res.onData) {
    return undefined;
  }

  let body = await new Promise((resolve) => {
    /* Register error cb */
    if (!res.abortHandler && res.onAborted) {
      res.onAborted(() => {
        if (res.stream) {
          res.stream.destroy();
        }
        res.aborted = true;
        resolve();
      });
      res.abortHandler = true;
    }

    let buffer: Buffer;
    res.onData((chunkPart, isLast) => {
      const chunk = Buffer.from(chunkPart);
      stream.push(
        new Uint8Array(
          chunkPart
        )
      );
      if (isLast) {
        stream.push(null);
        if (buffer) {
          resolve(Buffer.concat([buffer, chunk]).toString('utf8'));
        } else {
          resolve(chunk.toString('utf8'));
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });
  });

  if (!body) {
    return undefined;
  }

  return body as string;
};