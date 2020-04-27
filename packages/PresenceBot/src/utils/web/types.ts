import { RecognizedString, HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import { CookieSerializeOptions } from "cookie";
import { Readable } from "stream";
import { Options, LocalsObject } from "pug";
import { User } from "../../database/entities";

export type HTTPMethod = keyof Omit<TemplatedApp, 'listen' | 'publish' | 'ws'>;
export type RequestHandler = (req: PBRequest, res: PBResponse, next: (stop?: boolean) => any, err: (e: any) => any) => any;

export interface PBRequest extends HttpRequest {
  _cookies: Record<string, string>;
  body?: any;

  stream: Readable;
  pipe: Readable['pipe'];

  /** Setting yield to true is to say that this route handler did not handle the route, causing the router to continue looking for a matching route handler, or fail. */
  setYield(shouldYield: boolean): this;
  /** Read a cookie */
  cookie(name: string): string | null;
}
export interface PBResponse extends HttpResponse {
  /** Render a pug template */
  render(tpl: string, options?: Options & LocalsObject): Promise<void>;
  user: User;

  _reqHeaders: Record<string, string>;

  /** Send a JSON response */
  json(json: any): Promise<void>;

  /** Send a file */
  file(path: string): Promise<void>;

  /** Redirect to new location */
  redirect(location: string): void;

  /** Writes the HTTP status code. */
  writeStatus(status: string): PBResponse;
  writeStatus(status: number): PBResponse;

  setCookie(name: string, value: string, options?: CookieSerializeOptions): PBResponse;
  clearCookie(name: string): PBResponse;

  cookieWrites: Record<string, string>;
  
  /** Return type overrides */

  /** Writes key and value to HTTP response. */
  writeHeader(key: RecognizedString, value: RecognizedString): PBResponse;
  /** Enters or continues chunked encoding mode. Writes part of the response. End with zero length write. */
  write(chunk: RecognizedString): PBResponse;
  /** Ends this response by copying the contents of body. */
  end(body?: RecognizedString): PBResponse;
  
  /** Immediately force closes the connection. */
  close(): PBResponse;

  /** Registers a handler for writable events. Continue failed write attempts in here.
   * You MUST return true for success, false for failure.
   * Writing nothing is always success, so by default you must return true.
   */
  onWritable(handler: (offset: number) => boolean): PBResponse;

  /** Every HttpResponse MUST have an attached abort handler IF you do not respond
   * to it immediately inside of the callback. Returning from an Http request handler
   * without attaching (by calling onAborted) an abort handler is ill-use and will termiante.
   * When this event emits, the response has been aborted and may not be used. */
  onAborted(handler: () => void): PBResponse;

  /** Handler for reading data from POST and such requests. You MUST copy the data of chunk if isLast is not true. We Neuter ArrayBuffers on return, making it zero length.*/
  onData(handler: (chunk: ArrayBuffer, isLast: boolean) => void): PBResponse;
}