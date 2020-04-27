import { ScopedPresenceAdapter } from "../structs/scoped-adapter";
import { Presence, AdapterState, PresenceStruct } from "remote-presence-utils";
import { TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";
import * as uuid from "uuid";
import { readRequest } from "../utils";
import { FIRST_PARTY_SCOPE } from "../structs/socket-api-adapter";
import { PresenceDictionary } from "../utils/presence-magic";

export enum StatusCodes {
  BAD_REQ = '400 Bad Request',
  UNAUTHORIZED = '401 Unauthorized',
  OK = '200 OK'
}

export const Responses: Record<string, [string, string]> = {
  JSON: ['Content-Type', 'application/json'],
  HTML: ['Content-Type', 'text/html']
}

export interface RESTAdapterOptions {
  sessionExpiryMS?: number;
};

const error = (message: string) => JSON.stringify({ error: message });
const clean = (str: string | null) => str?.replace(/(\r\n|\n|\r)/gm, "");

export function handler(exec: (res: HttpResponse, req: HttpRequest) => any, headers: string[] = []): typeof exec {
  return (res, req) => {
    res.onAborted(() => {
      if (res.stream) {
        res.stream.destroy();
      }
      res.aborted = true;
    });

    res._reqHeaders = {};
    headers.forEach(h => {
      res._reqHeaders[h] = req.getHeader(h);
    });

    res._reqUrl = req.getUrl();
    res._reqQuery = req.getQuery();

    res._data = [];
    res._readable = false;
    res._readListeners = [];

    res.onReadable = function(cb: Function) {
      if (this._readable) {
        cb();
      } else {
        this._readListeners.push(cb);
      }
    }

    res.onData((chunk, last) => {
      res._data.push(chunk);

      if (last) {
        res._readable = true;
        res._readListeners.forEach((listener: Function) => listener());
      }
    });

    exec(res, req);
  }
}

export class RESTAdapter extends ScopedPresenceAdapter {
  /**
   * By default, the session will expire in five minutes.
   */
  static DEFAULT_EXPIRY_MS = 1000 * 10;

  sessionIndex: Record<string, string> = {};
  expirationTimeouts: Record<string, number> = {};
  presences: Record<string, Array<Partial<PresenceStruct>>> = {};
  state: AdapterState = AdapterState.READY;

  constructor(app: TemplatedApp, private validate: (token: string) => Promise<string | typeof FIRST_PARTY_SCOPE | null>, public readonly options: RESTAdapterOptions = {}) {
    super();

    if (!options.sessionExpiryMS) options.sessionExpiryMS = RESTAdapter.DEFAULT_EXPIRY_MS;


    const sessionBased = async (res: HttpResponse, req: HttpRequest) => {
      const params = new URLSearchParams(req.getQuery());
      const token = clean(params.get('token'));
      const sessionID = clean(params.get('id'));

      if (!token || !sessionID) {
        res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...Responses.JSON).end(error("Please provide a token and session ID."));
        return;
      }

      const user = await validate(token);

      if (!user || !this.sessionIndex[sessionID]) {
        res.writeStatus(StatusCodes.UNAUTHORIZED).writeHeader(...Responses.JSON).end(error("Invalid session or token."));
        return;
      }

      const body = await readRequest(res).catch(e => null);

      return {
        body,
        user,
        sessionID
      }
    }

    app.get('/session', (res, req) => {
      const executor = async () => {
        const params = new URLSearchParams(req.getQuery());
        const token = clean(params.get('token'));

        if (!token) {
          res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...Responses.JSON).end(error("Please provide a token."));
          return;
        }

        const user = await validate(token);

        if (!user) {
          res.writeStatus(StatusCodes.UNAUTHORIZED).writeHeader(...Responses.JSON).end(error("Invalid token."));
          return;
        }

        if (user === FIRST_PARTY_SCOPE) {
          res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...Responses.JSON).end(JSON.stringify({
            msg: "First party clients cannot use this endpoint."
          }));
          return;
        }

        const sessionID = this.createSession(user);

        res.writeStatus(StatusCodes.OK).writeHeader(...Responses.JSON).end(JSON.stringify({
          sessionID,
          expires: this.options.sessionExpiryMS
        }))
      }

      res.onAborted(() => {

      });

      executor();
    }).put('/session', (res, req) => {
      const executor = async () => {
        const sessionData = await sessionBased(res, req);
        if (!sessionData) return;
        const { body, sessionID, user } = sessionData;

        if (!body || !("presences" in body) || !Array.isArray(body.presences)) {
          res.writeStatus(StatusCodes.BAD_REQ).writeHeader(...Responses.JSON).end(error("Malformed body data."));
        }

        this.presences[sessionID] = body.presences;
        this.emit("updated", user);

        res.writeStatus(StatusCodes.OK).writeHeader(...Responses.JSON).end(JSON.stringify({ ok: true }));
      };

      res.onAborted(() => {

      });

      executor();
    }).put('/session/refresh', handler(async (res, req) => {
      const sessionData = await sessionBased(res, req);
      if (!sessionData) return;

      const { sessionID } = sessionData;

      this.scheduleExpiry(sessionID);

      res.writeStatus(StatusCodes.OK).writeHeader(...Responses.JSON).end(JSON.stringify({ ok: true }));
    }));
  }

  /**
   * Creates a session for the given user, returning the session ID
   * @param user user ID
   */
  createSession(user: string): string {
    const sessionID = uuid.v4();

    this.sessionIndex[sessionID] = user;
    this.presences[sessionID] = [];
    this.scheduleExpiry(sessionID);

    return sessionID;
  }

  /**
   * Destroys a given session
   * @param session session ID
   */
  destroySession(session: string) {
    const user = this.sessionIndex[session];

    this.clearExpiry(session);
    delete this.sessionIndex[session];
    delete this.presences[session];

    this.emit("updated", user);
  }

  /**
   * Clears the expiration timeout for a session
   * @param session session ID
   */
  clearExpiry(session: string) {
    if (this.expirationTimeouts[session]) clearTimeout(this.expirationTimeouts[session]);
  }

  /**
   * Schedules a deferred expiration of a session using the configured expiration
   * @param session session ID
   */
  scheduleExpiry(session: string): void {
    this.clearExpiry(session);
    this.expirationTimeouts[session] = setTimeout(() => {
      this.destroySession(session);
    }, this.options.sessionExpiryMS);
  }

  async activityForUser(id: string) {
    const activities = Object.entries(this.sessionIndex).filter(([, user]) => user === id).map(([session]) => this.presences[session]).reduce((a, c) => a.concat(c), []);
    return activities;
  }

  async activities() {
    const activities = await Promise.all(Object.values(this.sessionIndex).filter((u,i,a) => a.indexOf(u) === i).map(async u => ({ user: u, presence: await this.activityForUser(u) })));
    return activities.reduce((acc, {user, presence}) => Object.assign(acc, { [user]: presence }), {} as PresenceDictionary);
  }

  async run(): Promise<void> {
    this.state = AdapterState.RUNNING;
  }

  activity() {
    return [];
  }
}