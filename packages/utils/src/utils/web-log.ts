export type LoggingInterface = Pick<Console, "info" | "warn" | "error" | "debug">;

const colors: Record<keyof LoggingInterface, string> = {
  info: '\x1b[37m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[36m'
}

export class WebLogger implements LoggingInterface {
  constructor(public readonly trace: string, private output: LoggingInterface) {
  }

  info(message: string, ...args: any[]) {
    return this.print("info", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    return this.print("warn", message, ...args);
  }

  debug(message: string, ...args: any[]) {
    return this.print("debug", message, ...args);
  }

  error(message: string, ...args: any[]) {
    return this.print("error", message, ...args);
  }

  private print(level: keyof LoggingInterface, message: string, ...args: any[]) {
    this.output[level](`${this.prettyTrace}${this.color(level)}${typeof message === "string" ? message : ''}`, ...(typeof message === "object" ? (args.unshift(message), args) : args));
  }

  color(level: keyof LoggingInterface) {
    return colors[level];
  }

  get prettyTrace() {
    return `\x1b[35m[${this.trace}] `;
  }
}