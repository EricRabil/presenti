import { PayloadType, isRemotePayload, PayloadValidators, IdentifyPayload } from "remote-presence-utils";
import * as uuid from "uuid";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { log, blackHat } from "../utils";
import { User } from "../database/entities";
import { SecurityKit } from "../security";
import { ScopedPresenceAdapter } from "./scoped-adapter";

export function Handler(payloadType: PayloadType) {
  return function<T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor) {
    if (!target.handlers) target.handlers = blackHat(HandlerStructBase) as any
    target.handlers[payloadType] = { property: property as any, handler: (target[property] as any) as PayloadHandler };
  }
}

function MetadataSetter<T extends keyof HandlerMetadata>(metadataKey: T, defaultValue: HandlerMetadata[T]) {
  return function(value = defaultValue) {
    return function<T extends SocketAPIAdapter>(target: T, property: keyof T, descriptor?: PropertyDescriptor) {
      if (!target.handlerMetadata) target.handlerMetadata = blackHat(HandlerMetadataBase);
      target.handlerMetadata[property][metadataKey] = value;
    }
  }
}

export const Authed = MetadataSetter("authed", true);
export const FirstParty = MetadataSetter("firstParty", true);
export const DenyFirstParty = MetadataSetter("denyFirstParty", true);
export const DenyAuthed = MetadataSetter("denyAuthed", true);

export type PayloadHandler = (ws: WebSocket, data: any) => any;
export const FIRST_PARTY_SCOPE = Symbol("FIRST_PARTY");

export class SocketContext<T extends SocketAPIAdapter = SocketAPIAdapter> {
  close = this.ws.close.bind(this.ws);
  static socketLog = log.child({ name: "SocketContext" })
  readonly id: string = uuid.v4();

  constructor(public readonly ws: WebSocket, private adapter: T) {
  }

  send(type: PayloadType, data: any = null) {
    this.assertAlive();
    this.ws.send(JSON.stringify({ type, data }));
    this.log.debug("Sending payload to socket", { socketID: this.id, payload: { type, data }});
  }

  private get log() {
    return SocketContext.socketLog;
  }

  get scope() {
    this.assertAlive();
    return this.adapter.sockets.get(this.ws)!;
  }

  get authenticated() {
    this.assertAlive();
    return this.adapter.isAuthenticated(this.ws);
  }

  get firstParty() {
    this.assertAlive();
    return this.adapter.isFirstParty(this.ws);
  }

  get dead(): boolean {
    return this.adapter.contexts.get(this.ws) !== this;
  }

  private assertAlive() {
    if (this.dead) {
      throw new Error("Cannot use context after socket is closed.");
    }
  }
}

interface HandlerStruct<T = any> {
  property: keyof T;
  handler: Function;
}

const HandlerStructBase: HandlerStruct = {
  property: null as any,
  handler: null as any
}

export interface HandlerMetadata {
  authed: boolean;
  denyAuthed: boolean;
  firstParty: boolean;
  denyFirstParty: boolean;
}

const HandlerMetadataBase: HandlerMetadata = {
  authed: false,
  denyAuthed: false,
  firstParty: false,
  denyFirstParty: false
}

export abstract class SocketAPIAdapter extends ScopedPresenceAdapter {
  /**
   * A map of sockets to their scope ID
   */
  sockets: Map<WebSocket, string | typeof FIRST_PARTY_SCOPE> = new Map();
  contexts: Map<WebSocket, SocketContext> = new Map();
  handlers: Record<PayloadType, HandlerStruct<this>>;
  handlerMetadata: Record<keyof this, HandlerMetadata>;
  log = log.child({ name: "SocketAPIAdapter "});

  constructor(app: TemplatedApp, path: string) {
    super();

    app.ws(path, {
      open: (ws) => {
        this.contexts.set(ws, new SocketContext(ws, this));
        this.log.debug("Socket connected", { socketID: this.contexts.get(ws)!.id })
      },
      close: (ws) => {
        this.closed(this.contexts.get(ws)!.id);
        this.contexts.delete(ws);
        this.sockets.delete(ws);
      },
      message: (ws, message) => {
        const rawString = Buffer.from(message).toString('utf8');
        var parsed;
        try {
          parsed = JSON.parse(rawString);
        } catch (e) {
          this.log.error('Failed to parse payload from remote client', { rawString, e });
          // close the socket for making us deal with this shit
          ws.close();
          return;
        }

        if (!isRemotePayload(parsed)) return;
        if (!this.handlers[parsed.type]) return;

        const { property, handler } = this.handlers[parsed.type];
        if (!handler) return;

        const { authed, firstParty, denyFirstParty, denyAuthed } = this.handlerMetadata[property];
        const context = this.contexts.get(ws)!;

        // enforce properly-formed payloads.
        if (!PayloadValidators[parsed.type] || !PayloadValidators[parsed.type](parsed)) {
          this.log.debug('Got an invalid payload from the socket. Closing.', { payload: parsed, socketID: context });
          context.close();
          return;
        }

        // enforce denial of authenticated clients
        if (denyAuthed && context.authenticated) {
          context.close();
          return;
        }

        // enforce authenticated
        if (authed && !context.authenticated) {
          context.close();
          return;
        }

        // enforce denial of first party clients
        if (denyFirstParty && context.firstParty || context.scope === FIRST_PARTY_SCOPE) {
          context.close();
          return;
        }

        // enforce first party
        if (firstParty && !context.firstParty) {
          context.close();
          return;
        }

        this.log.debug('Passing payload to handler', { payload: parsed, socketID: context.id });

        handler.call(this, context, parsed.data);
      }
    });
  }

  /**
   * Identification handler for sockets. Must return true if authentication failed, and false if otherwise.
   * @param ws socket context
   * @param data payload data
   */
  @Handler(PayloadType.IDENTIFY)
  @DenyAuthed()
  async identificationHandler(ws: SocketContext, token: IdentifyPayload["data"], sendGreetings: boolean = true): Promise<boolean> {
    this.log.debug("Socket initiated authentication flow.", { socketID: ws.id });

    var identity: User | typeof FIRST_PARTY_SCOPE | string | null = await SecurityKit.validateApiKey(token);

    // invalid or expired identity
    if (!identity) {
      this.log.debug("Invalid identity for socket.", { socketID: ws.id });
      ws.close();
      return false;
    }

    // set the identity to the uuid
    if (identity instanceof User) {
      identity = identity.userID;
    }

    // Socket joined the game
    this.authenticate(ws, identity);

    if (sendGreetings) {
      ws.send(PayloadType.GREETINGS);
    }

    return true;
  }

  @Handler(PayloadType.PING)
  pingHandler(ws: SocketContext) {
    ws.send(PayloadType.PONG);
  }

  closed(id: string): any {
    this.log.debug("Socket closed.", { socketID: id });
  }

  authenticate(ws: WebSocket | SocketContext, scope: string | typeof FIRST_PARTY_SCOPE) {
    if (ws instanceof SocketContext) ws = ws.ws;
    this.sockets.set(ws, scope);
  }

  isAuthenticated(ws: WebSocket) {
    return this.sockets.has(ws);
  }

  isFirstParty(ws: WebSocket) {
    return this.sockets.get(ws) === FIRST_PARTY_SCOPE;
  }
}