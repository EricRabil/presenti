import { HttpResponse } from "uWebSockets.js";
import winston from "winston";
import v8 from "v8";

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
import chalk from "chalk";

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
  run(): Promise<void> | void;
}

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
}

export const log = winston.createLogger({
  levels: logLevels.levels,
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format((info, opts = {}) => {
          if (info.name) {
            info.level = `${info.level} ${chalk.magenta(info.name)}`;
            delete info.name;
          }

          return info;
        })(),
        winston.format.simple()
      )
    })
  ]
})

export function blackHat<T, U = any>(defaultValue: T): Record<keyof U, T> {
  const base = v8.serialize(defaultValue);
  return new Proxy({} as any as Record<keyof U, T>, {
    get<U extends Record<string, T>>(target: U, prop: keyof U, receiver: Function) {
      if (!target[prop]) Reflect.set(target, prop, v8.deserialize(base));

      return Reflect.get(target, prop, receiver);
    }
  });
}