import log from "@presenti/logging";
import { ScopedPresenceAdapter } from "@presenti/modules";
import { FIRST_PARTY_SCOPE, IdentifyPayload, isRemotePayload, PayloadType, PayloadValidators } from "@presenti/utils";
import * as uuid from "uuid";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { blackHat } from "../utils/object";
import { SecurityKit } from "../utils/security";

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

/** Contextual wrapper for socket connections */
export class SocketContext<T extends SocketAPIAdapter = SocketAPIAdapter> {
  static socketLog = log.child({ name: "SocketContext" })
  readonly id: string = uuid.v4();

  constructor(public readonly ws: WebSocket, private adapter: T) {
  }

  close() {
    this.ws.close();
  }

  /**
   * Sends a payload to the socket
   * @param type payload type
   * @param data data to send, null if empty
   */
  send(type: PayloadType, data: any = null) {
    this.assertAlive();
    this.ws.send(JSON.stringify({ type, data }));
    this.log.debug("Sending payload to socket", { socketID: this.id, payload: { type, data }});
  }

  private get log() {
    return SocketContext.socketLog;
  }

  /** The scope this socket is connected to */
  get scope() {
    this.assertAlive();
    return this.adapter.sockets.get(this.ws)!;
  }

  /** Whether the socket has authenticated with the server */
  get authenticated() {
    this.assertAlive();
    return this.adapter.isAuthenticated(this.ws);
  }

  /** Whether the socket is a first-party connection */
  get firstParty() {
    this.assertAlive();
    return this.adapter.isFirstParty(this.ws);
  }

  /** Whether the socket is closed */
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

/** Metadata used when processing a payload, defined by decorators */
interface HandlerMetadata {
  authed: boolean;
  denyAuthed: boolean;
  firstParty: boolean;
  denyFirstParty: boolean;
}

/** Initial metadata object */
const HandlerMetadataBase: HandlerMetadata = {
  authed: false,
  denyAuthed: false,
  firstParty: false,
  denyFirstParty: false
}

/** Foundation for any socket-based API */
export abstract class SocketAPIAdapter extends ScopedPresenceAdapter {
  /**
   * A map of sockets to their scope ID
   */
  sockets: Map<WebSocket, string | typeof FIRST_PARTY_SCOPE> = new Map();
  contexts: Map<WebSocket, SocketContext> = new Map();
  contextsByID: Map<string, SocketContext> = new Map();
  handlers: Record<PayloadType, HandlerStruct<this>>;
  handlerMetadata: Record<keyof this, HandlerMetadata>;
  log = log.child({ name: "SocketAPIAdapter "});

  constructor(app: TemplatedApp, path: string) {
    super();

    app.ws(path, {
      open: (ws) => {
        const ctx = new SocketContext(ws, this);
        this.contexts.set(ws, ctx);
        this.contextsByID.set(ctx.id, ctx);
        this.log.debug("Socket connected", { socketID: this.contexts.get(ws)!.id });
      },
      close: (ws) => {
        const ctxID = this.contexts.get(ws)!.id;
        this.closed(ctxID);
        this.contexts.delete(ws);
        this.contextsByID.delete(ctxID);
        this.sockets.delete(ws);
      },
      message: (ws, message) => {
        const rawString = Buffer.from(message).toString('utf8');
        var parsed: any;
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
          this.log.debug('Got an invalid payload from the socket. Closing.', { payload: parsed, socketID: context.id });
          context.close();
          return;
        }

        const trace = (msg: string) => this.log.debug(msg, { payload: parsed, socketID: context.id });

        // enforce denial of authenticated clients
        if (denyAuthed && context.authenticated) {
          trace('Closing socket for calling an endpoint that requires un-authentication.');
          context.close();
          return;
        }

        // enforce authenticated
        if (authed && !context.authenticated) {
          trace('Closing socket for calling an endpoint that requires authentication, when they weren\'t authenticated.');
          context.close();
          return;
        }

        // enforce denial of first party clients
        if (denyFirstParty && (context.firstParty || context.scope === FIRST_PARTY_SCOPE)) {
          trace('Closing first-party socket for calling an endpoint that is not for first-parties.');
          context.close();
          return;
        }

        // enforce first party
        if (firstParty && !context.firstParty) {
          trace('Closing third-party socket for calling and endpoint that is for first-parties.');
          context.close();
          return;
        }

        if (process.env.PRESENTI_LOG_SOCKET_PAYLOADS) {
          this.log.debug('Passing payload to handler', { payload: parsed.type === PayloadType.IDENTIFY ? { type: PayloadType.IDENTIFY, data: "REDACTED" } : parsed, socketID: context.id });
        }

        handler.call(this, context, parsed.data);
      },
      maxPayloadLength: 1643751
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

    const { user, firstParty } = await SecurityKit.validateApiKey(token);
    let identity: string | typeof FIRST_PARTY_SCOPE;

    // set the identity to the uuid
    if (user) {
      identity = user.userID;
    } else if (firstParty) {
      identity = FIRST_PARTY_SCOPE;
    } else {
      // invalid or expired identity
      this.log.debug("Invalid identity for socket.", { socketID: ws.id });
      ws.close();
      return false;
    }

    // Socket joined the game
    this.authenticate(ws, identity);

    if (sendGreetings) {
      ws.send(PayloadType.GREETINGS);
    }

    return true;
  }

  /**
   * Expert ping-pong player.
   * @param ws socket context
   */
  @Handler(PayloadType.PING)
  pingHandler(ws: SocketContext) {
    ws.send(PayloadType.PONG);
  }

  /**
   * Called upon close
   * @param id socket ID
   */
  closed(id: string): any {
    this.log.debug("Socket closed.", { socketID: id });
  }

  /**
   * Marks a socket as authenticated with the given scope
   * @param ws socket/socket context
   * @param scope socket scope
   */
  authenticate(ws: WebSocket | SocketContext, scope: string | typeof FIRST_PARTY_SCOPE) {
    if (ws instanceof SocketContext) ws = ws.ws;
    this.sockets.set(ws, scope);
  }

  /**
   * Returns true if the socket is authenticated
   * @param ws socket
   */
  isAuthenticated(ws: WebSocket) {
    return this.sockets.has(ws);
  }

  /**
   * Returns true if the socket is first-party scoped
   * @param ws socket
   */
  isFirstParty(ws: WebSocket) {
    return this.sockets.get(ws) === FIRST_PARTY_SCOPE;
  }
}