import { PresenceAdapter, Presence, AdapterState } from "../adapter";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import uuid from "node-uuid";
import { Activity } from "discord.js";
import { ScopedPresenceAdapter } from "../scoped-adapter";

export interface RemoteAdapterOptions {
  
}

export interface RemotePayload {
  type: PayloadType;
  data?: any;
}

export interface RemotePresencePayload {
  type: PayloadType.PRESENCE;
  data: Presence[];
}

export enum PayloadType {
  PING, PONG, PRESENCE, IDENTIFY, GREETINGS
}

export function isRemotePayload(payload: any): payload is RemotePayload {
  return "type" in payload;
}

export interface PresenceUpdateEvent {
  $selector: string;
}

export class RemoteAdapter extends ScopedPresenceAdapter {
  clients: Record<string, WebSocket> = {};
  ids: Map<WebSocket, string> = new Map();
  /**
   * Map of [connectionID, userID]
   */
  authTable: Record<string, string | null> = {};
  presences: Record<string, Array<Partial<Activity> | undefined>> = {};

  constructor(app: TemplatedApp, private validate: (token: string) => Promise<string | null>) {
    super();

    app.ws('/remote', {
      open: (ws, req) => {
        const id = uuid.v4();
        
        // set a two-way map for the clients and their IDs
        this.clients[id] = ws;
        this.ids.set(ws, id);

        // set a null state for the connection ID
        this.authTable[id] = null;
      },
      message: async (ws, message) => {
        const id = this.ids.get(ws);
        if (!id) return;
        const { [id]: authenticated } = this.authTable;
        const rawStr = Buffer.from(message).toString('utf8');
        var parsed;
        try {
          parsed = JSON.parse(rawStr);
        } catch (e) {
          console.log({
            e,
            rawStr,
            message
          })
          // close on malformed payload
          ws.close();
          return;
        }
        if (!isRemotePayload(parsed)) return;
        
        switch (parsed.type) {
          case PayloadType.PING:
            // pong!
            ws.send(JSON.stringify({type: PayloadType.PONG}));
            break;
          case PayloadType.PRESENCE:
            // close if not authenticated >:(
            if (!authenticated) {
              ws.close();
              break;
            }
            if (!parsed.data) break;
            if (!Array.isArray(parsed.data)) parsed.data = [parsed.data];
            this.presences[id] = parsed.data;
            this.emit("presence", authenticated);
            break;
          case PayloadType.IDENTIFY:
            // close if already authenticated >:(
            if (authenticated) {
              console.log('fuck');
              ws.close();
              break;
            }
            const token = parsed.data;
            const user = await this.validate(token);
            // close if we couldnt validate the token
            if (!user) {
              console.log('die');
              ws.close();
              break;
            }
            // welcome to the club, baby
            this.authTable[id] = user;
            this.presences[id] = [];
            ws.send(JSON.stringify({type: PayloadType.GREETINGS}));
            break;
        }
      },
      close: (ws, code, message) => {
        const id = this.ids.get(ws);
        if (!id) return;
        const { [id]: authenticated } = this.authTable;
        delete this.authTable[id];
        delete this.clients[id];
        delete this.presences[id];
        this.ids.delete(ws);
        this.emit("presence", authenticated);
      }
    })
  }

  state: AdapterState = AdapterState.READY;

  async run(): Promise<void> {
    this.state = AdapterState.RUNNING;
  }

  /**
   * Returns all presence packets
   */
  async activity(): Promise<import("../adapter").Presence> {
    return Object.values(this.presences).filter(p => (
      !!p && Array.isArray(p)
    )).reduce((a, c) => (
      a.concat(c)
    ), []).filter(a => !!a) as any;
  }

  /**
   * Returns presence packets for a specific user
   * @param id id to query
   */
  async activityForUser(id: string) {
    const socketIDs = Object.entries(this.authTable).filter(([socket, user]) => user === id).map(([socket]) => socket);
    const presences = socketIDs.map(socket => this.presences[socket]);
    return presences.map(list => list.filter(presence => !!presence)).reduce((a,c) => a.concat(c), []) as any;
  }
}