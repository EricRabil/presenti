export enum AdapterState {
  READY, RUNNING
}

export type PresenceText = string | null | {
  text: string;
  /** if omitted, defaults to text */
  type?: "text" | "md";
  link?: string | null;
}

export type PresenceImage = string | null | {
  src: string;
  link?: string | null;
}

export type PresenceTimeRange = {
  start: number | null;
  effective: number | null;
  stop: number | null;
} | null;

export interface ErrorResponse {
  error: string;
  code: number;
  fields: string[] | undefined;
};

export type PresenceList = Array<Partial<PresenceStruct>>;
export type PresenceDictionary = Record<string, PresenceList>;

export interface PresenceStruct {
  id?: string | null;
  title?: PresenceText;
  largeText?: PresenceText;
  smallTexts?: PresenceText[];
  image?: PresenceImage;
  timestamps?: PresenceTimeRange;
  gradient?: boolean | {
    // use this to take precedence over other gradients, otherwise 0
    priority?: number | null;
    enabled: boolean;
  } | null;
  shades?: string[];
  isPaused?: boolean | null;
}

export enum TransformationType {
  SET = "set", REPLACE = "replace", DELETE = "delete"
}

export interface PresenceTransformation {
  type: TransformationType;
  value?: string;
  property?: keyof PresenceStruct;
  match?: string;
}

export interface DynamicTransformation extends PresenceTransformation {
  /** are we setting, replacing, deleting */
  type: TransformationType;
  /** value to be used in the transformation */
  value?: string;
  /** value to use when matching transformations */
  match: string;
  /** properties cant be targeted in a dynamic transformation, its just whatever matches is applied to */
  property?: undefined;
}

export interface PropertyTransformation extends PresenceTransformation {
  /** are we setting, replacing, deleting */
  type: TransformationType;
  /** property targeted for the transformation */
  property: keyof PresenceStruct;
  /** value to be used in the transformation if this is setting or replacing */
  value?: string;
  /** matching string to be used if this is targeted at a property */
  match?: string;
}

export interface PresenceTransformationRecord {
  uuid: string;
  rule: PresenceTransformation | null;
  ids: string[];
}

export interface TransformationModelUpdateOptions {
  ids?: string[] | null | undefined;
  rule?: PresenceTransformation | null | undefined;
}

export interface TransformationModelCreateOptions {
  ids: string[];
  rule: PresenceTransformation;
}

export interface PresentiUser {
  uuid: string;
  displayName: string | null;
  userID: string;
  platforms: Record<OAUTH_PLATFORM, PresentiLink> | null;
  excludes: string[];
}

export type Presence = Partial<PresenceStruct> | Array<Partial<PresenceStruct>> | undefined;

export enum PipeDirection {
  NOWHERE, PRESENTI, PLATFORM, BIDIRECTIONAL
}

interface OAuthBaseQuery {
  platform: OAUTH_PLATFORM;
  pipeDirection?: PipeDirection;
}

interface OAuthPlatformIDQuery extends OAuthBaseQuery {
  platformID: string;
}

interface OAuthUserUUIDQuery extends OAuthBaseQuery {
  userUUID: string;
}

interface OAuthUUIDQuery {
  uuid: string;
}

export type OAuthQuery = OAuthPlatformIDQuery | OAuthUserUUIDQuery | OAuthUUIDQuery;
export type OAuthData = OAuthPlatformIDQuery & OAuthUserUUIDQuery;

export interface PresentiLink {
  uuid: string;
  platform: OAUTH_PLATFORM;
  platformID: string;
  userUUID: string;
  pipeDirection: PipeDirection;
}

export interface ResolvedPresentiLink extends PresentiLink {
  scope: string;
}

export interface RemotePayload {
  type: PayloadType;
  data?: any;
}

export interface RemotePresencePayload {
  type: PayloadType.PRESENCE;
  data: {
    presence: PresenceStruct[];
    state: Record<string, any>;
  };
}

export interface FirstPartyPresenceData {
  scope: string;
  presence: Array<Partial<PresenceStruct> | undefined>;
}

export interface FirstPartyPresencePayload {
  type: PayloadType.PRESENCE_FIRST_PARTY;
  data: FirstPartyPresenceData;
}

export interface IdentifyPayload {
  type: PayloadType.IDENTIFY;
  data: string;
}

export interface PingPayload {
  type: PayloadType.PING;
}

export interface PongPayload {
  type: PayloadType.PONG;
}

export interface GreetingsPayload {
  type: PayloadType.GREETINGS;
}

export interface SubscriptionPayload {
  type: PayloadType.SUBSCRIBE | PayloadType.UNSUBSCRIBE;
  data: {
    event: Events | Events[];
  }
}

export interface DispatchPayload<T extends Events = any> {
  type: PayloadType.DISPATCH;
  data: {
    event: T;
    data: EventsTable[T];
  };
}

export enum PayloadType {
  PING = 0, PONG = 1, PRESENCE = 2, IDENTIFY = 3, GREETINGS = 4, PRESENCE_FIRST_PARTY = 5, SUBSCRIBE = 6, UNSUBSCRIBE = 7, DISPATCH = 8
}

export enum API_ROUTES {
  LINK_CODE = "/api/linkcode/validate",
  GENERATE_LINK_CODE = "/api/linkcode",
  API_KEY = "/api/apikey",
  DISCORD_AUTH = "/api/oauth/discord",
  DISCORD_AUTH_CALLBACK = "/api/oauth/discord/callback",
  DISCORD_AUTH_UNLINK = "/api/oauth/unlink"
}

export enum OAUTH_PLATFORM {
  DISCORD = "DISCORD",
  SPOTIFY = "SPOTIFY",
  SPOTIFY_INTERNAL = "SPOTIFY_INTERNAL",
  SLACK = "SLACK"
}

export enum Events {
  OAUTH_UPDATE,
  LINK_CREATE,
  LINK_UPDATE,
  LINK_REMOVE,
  USER_CREATE,
  USER_UPDATE,
  PRESENCE_UPDATE,
  STATE_UPDATE
}

export interface OAuthEvent {
  user: PresentiUser;
  /** New array of OAuth connections */
  platforms: Record<OAUTH_PLATFORM, PresentiLink> | null;
}

export interface UserEvent {
  /** User entity representing the user */
  user: PresentiUser;
}

export interface PresenceUpdateEvent {
  /** Scope for which the presence changed */
  scope: string;
  presence: PresenceList;
}

export interface StateUpdateEvent {
  /** Scope for which the state changed */
  scope: string;
  state: Record<string, any>;
}

export interface LinkEvent extends PresentiLink { }

export interface EventsTable {
  [Events.OAUTH_UPDATE]: OAuthEvent;
  [Events.PRESENCE_UPDATE]: PresenceUpdateEvent;
  [Events.STATE_UPDATE]: StateUpdateEvent;
  [Events.USER_CREATE]: UserEvent;
  [Events.USER_UPDATE]: UserEvent;
  [Events.LINK_UPDATE]: LinkEvent;
  [Events.LINK_CREATE]: LinkEvent;
  [Events.LINK_REMOVE]: LinkEvent;
}

export function isRemotePayload(payload: any): payload is RemotePayload {
  return "type" in payload;
}

/** Modules */

export interface PresentiOAuthSchema {
  type: "oauth" | "entry" | "custom";
  contentsVisible?: boolean;
}

export interface OAuthModuleDefinition {
  asset: string;
  name: string;
  key: OAUTH_PLATFORM;
  link: string;
  unlink: string;
  schema: PresentiOAuthSchema;
}

export interface SuccessResponse {
  ok: true;
}