import { Evented } from "@presenti/utils";
import { LoggingInterface } from "@presenti/utils";

export interface BaseClientOptions {
  host: string;
  secure?: boolean;
  log?: LoggingInterface;
  trace?: (direction: "to" | "from", data: string) => any;
}

const NoopLoggingInterface: LoggingInterface = {
  info(...args: any[]) {},
  warn(...args: any[]) {},
  error(...args: any[]) {},
  debug(...args: any[]) {}
}

export abstract class BaseClient<T extends BaseClientOptions> extends Evented {
  private _log: LoggingInterface;
  constructor(protected options: T) {
    super();
  }

  set secure(secure) {
    this.options.secure = secure;
  }

  get secure() {
    return (typeof this.options.secure === "boolean") ? this.options.secure : typeof location === 'object' ? location.protocol === "https:" : false;
  }

  get trace() {
    return this.options.trace;
  }

  set trace(trace) {
    this.options.trace = trace;
  }

  get host() {
    return this.options.host;
  }

  set host(host) {
    this.options.host = host;
  }

  get log() {
    return this.options.log || NoopLoggingInterface;
  }
}