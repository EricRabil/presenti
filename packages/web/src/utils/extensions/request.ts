import cookie from "cookie";
import { HttpRequest } from "uWebSockets.js";
import { PBRequest, PBResponse } from "../types";

/** Adds functions to an HttpRequest to meet the PBRequest specification */
export default function extendRequest(req: HttpRequest, res: PBResponse): PBRequest {
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

    newRequest.getSearch = function () {
        if (!res._searchParams) {
            const params = new URLSearchParams(this.getQuery());
            res._searchParams = Array.from(params.entries()).reduce((acc, [key, value]) => Object.assign(acc, { [key]: value }), {});
        }
        return res._searchParams;
    }

    newRequest.getHeader = function (key) {
        return res._reqHeaders[key as any];
    }

    newRequest.getMethod = function () {
        return res._method;
    }

    Object.defineProperty(newRequest, "method", {
        get() {
            return newRequest.getMethod();
        },
        configurable: true
    });

    Object.defineProperty(newRequest, "url", {
        get() {
            return newRequest.getUrl();
        },
        configurable: true
    });

    Object.defineProperty(newRequest, "headers", {
        get() {
            return res._reqHeaders;
        },
        configurable: true
    });

    return newRequest;
}
