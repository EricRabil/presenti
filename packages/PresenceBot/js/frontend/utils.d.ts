/// <reference types="node" />
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { PBRequest, PBResponse, RequestHandler } from "./types";
export declare function toArrayBuffer(buffer: Buffer): ArrayBuffer;
export declare function wrapRequest(req: HttpRequest, res: PBResponse): PBRequest;
export declare function wrapResponse(res: HttpResponse, templateResolver?: (file: string) => string): PBResponse;
export declare function runMiddleware(req: PBRequest, res: PBResponse, middleware: RequestHandler[]): Promise<void>;
