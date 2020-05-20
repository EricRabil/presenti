import { BaseClient, BaseClientOptions } from "./base-client";

export type ParamsStruct = Record<string, string | number | boolean | any>;
export type BodyStruct = object;
export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: ParamsStruct;
  body?: BodyStruct;
  headers?: Record<string, string>;
  base?: string;
}

export namespace AJAXKit {
  export function get(url: string, opts: RequestOptions = {}) {
    return fetchJSON(url, "get", opts);
  }

  export function post(url: string, opts: RequestOptions = {}) {
    return fetchJSON(url, "post", opts);
  }

  export function del(url: string, opts: RequestOptions = {}) {
    return fetchJSON(url, "delete", opts);
  }

  export function patch(url: string, opts: RequestOptions = {}) {
    return fetchJSON(url, "patch", opts);
  }

  export async function fetchJSON(url: string, method: string, { params, body, headers, base, ...options }: RequestOptions = {}) {
    method = method.toUpperCase();
    const urlComponents = new URL(`${url.startsWith('/api') ? '' : '/api'}${url.startsWith('/') ? '' : '/'}${url}`, base);
    if (params) {
      Object.entries(params).forEach(([ key, value ]) => (typeof value !== "undefined") && urlComponents.searchParams.set(key, value.toString()));
    }
    
    const fetchOptions: RequestInit = {
      method,
      headers: body ? {
        'Content-Type': 'application/json',
        ...headers
      } : headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      ...options
    };

    try {
      const r = await fetch(urlComponents.toString(), fetchOptions);
      return await r.json();
    } catch {
      return null;
    }
  }
}

type AJAXProtocol = typeof AJAXKit;

export interface AJAXClientOptions extends BaseClientOptions {
  ajax?: RequestOptions;
  authorizationToken?: string;
}

export class AJAXClient extends BaseClient<AJAXClientOptions> implements AJAXProtocol {
  constructor(options: AJAXClientOptions) {
    super(options);

    this.log.debug(`Initialized AJAX Client with the following configuration:`, {
      baseURL: this.baseURL,
      mixinHeaders: this.mixinHeaders,
      ajax: this.ajax,
      secure: this.secure,
      host: this.host
    })
  }

  get(url: string, params: ParamsStruct = {}) {
    return this.fetchJSON(url, "get", { params });
  }

  post(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "post", opts);
  }

  del(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "delete", opts);
  }

  patch(url: string, opts: RequestOptions = {}) {
    return this.fetchJSON(url, "patch", opts);
  }

  async fetchJSON(url: string, method: string, options: RequestOptions = {}) {
    options.headers = options.headers ? { ...options.headers, ...this.mixinHeaders } : this.mixinHeaders;
    return AJAXKit.fetchJSON(url, method, { ...options, base: this.baseURL });
  }

  get baseURL() {
    return `${this.secure ? 'https' : 'http'}://${this.host}`;
  }

  get ajax() {
    return this.options.ajax || {};
  }

  get mixinHeaders() {
    const headers: Record<string, string> = {};
    if (this.options.authorizationToken) headers.authorization = this.options.authorizationToken;
    return headers;
  }

  set ajax(ajax) {
    this.options.ajax = ajax;
  }
}