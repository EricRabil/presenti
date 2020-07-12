import { PresenceOutput, PresenceProvider } from "@presenti/modules";
import { Events, isRemotePayload, PayloadType } from "@presenti/utils";
import { TemplatedApp, WebSocket } from "uWebSockets.js";

/**
 * Composes the Presence Streaming API, accessible via ws://<host>/presence/{scope}
 */
export class PresenceStreamOutput extends PresenceOutput {
  /** Record of <scope, connections> */
  clients: Record<string, WebSocket[]> = {};
  /** Record of <connection, scope> */
  idMap: Map<WebSocket, string> = new Map();

  constructor(provider: PresenceProvider, app: TemplatedApp) {
    super(provider, app, [Events.STATE_UPDATE, Events.PRESENCE_UPDATE]);

    app.ws('/presence/:id', {
      upgrade: (res, req, context) => {
        res.upgrade({
          id: req.getParameter(0)
        },
        /* Spell these correctly */
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context);
      },
      open: async (ws) => {
        this.mountClient(ws.id, ws);
        ws.send(JSON.stringify(await this.payload(ws.id, true)));
      },
      message: (ws, msg) => {
        const rawStr = Buffer.from(msg).toString('utf8');
        var parsed: unknown;
        try {
          parsed = JSON.parse(rawStr);
        } catch (e) {
          ws.close();
          return;
        }
        if (!isRemotePayload(parsed)) return;

        switch (parsed.type) {
          case PayloadType.PING:
            ws.send(JSON.stringify({type: PayloadType.PONG}));
            break;
        }
      },
      close: (ws) => {
        this.unmountClient(ws);
      }
    });
  }

  connected(scope: string) {}
  disconnected(scope: string) {}

  async payload(id: string, newClient: boolean = false) {
    const { presence, state } = await super.payload(id, newClient);

    return {
      type: PayloadType.PRESENCE,
      data: {
        presence,
        state
      }
    } as any
  }

  /**
   * Dispatches the latest presence state to the given selector
   * @param selector selector to dispatch to
   */
  async updated(scope: string) {
    const clients = this.clients[scope];
    if (!clients || clients.length === 0) return;
    const payload = JSON.stringify(await this.payload(scope));

    return this.broadcast(scope, payload);
  }

  /**
   * Broadcasts the given payload to the given scope
   * @param scope scope to broadcast to
   * @param payload payload to broadcast
   */
  broadcast(scope: string, payload: string) {
    const clients = this.clients[scope];
    if (!clients || clients.length === 0) return;

    return Promise.all(
      clients.map(client => (
        client.send(payload)
      ))
    );
  }

  /**
   * Allocates resources to a websocket with a scope ID
   * @param id scope ID
   * @param socket socket
   */
  mountClient(id: string, socket: WebSocket) {
    const clients = (this.clients[id] || (this.clients[id] = []));
    if (clients.includes(socket)) return;
    this.idMap.set(socket, id);
    clients.push(socket);
    this.connected(id);
  }

  /**
   * Deallocates resources for a websocket
   * @param socket socket to deallocate
   */
  unmountClient(socket: WebSocket) {
    const id = this.idMap.get(socket);
    if (!id) return;
    const clients = (this.clients[id] || (this.clients[id] = []));
    if (!clients.includes(socket)) return;
    clients.splice(clients.indexOf(socket), 1);
    this.idMap.delete(socket);
    this.disconnected(id);
  }
}