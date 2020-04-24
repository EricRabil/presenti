import { HttpResponse } from "uWebSockets.js";

/* Helper function for reading a posted JSON body */
export function readRequest(res: HttpResponse): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer: Buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
      let chunk = Buffer.from(ab);
      if (isLast) {
        let json;
        if (buffer) {
          try {
            json = JSON.parse(Buffer.concat([buffer, chunk]).toString());
          } catch (e) {
            json = null;
          }
          resolve(json);
        } else {
          try {
            json = JSON.parse(chunk.toString());
          } catch (e) {
            json = null;
          }
          resolve(json);
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });

    /* Register error cb */
    res.onAborted(reject);
  })
}

import got from "got";
import splashy from "splashy";
import { AdapterState, Evented } from "remote-presence-utils";

export namespace PresentiKit {
  export async function generatePalette(imageURL: string): Promise<string[]> {
    const body = await got(imageURL).buffer();
    const palette = await splashy(body);
    return palette;
  }
}

export interface AdapterStruct extends Evented {
  on(event: "updated", listener: (scope?: string) => any): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "updated", scope?: string): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;

  readonly state: AdapterState;
  run(): Promise<void>;
}