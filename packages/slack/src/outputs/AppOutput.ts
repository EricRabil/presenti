import { PresenceOutput } from "@presenti/modules";
import { UserLoader } from "@presenti/server/dist/web/loaders";
import { IdentityGuardFrontend } from "@presenti/server/dist/web/middleware";
import { OAUTH_PLATFORM, PresentiUser } from "@presenti/utils";
import { APIError, BodyParser, PBRequest, PBResponse, RequestHandler } from "@presenti/web";
import { createEventAdapter } from "@slack/events-api";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import { createMessageAdapter } from "@slack/interactive-messages";
import SlackMessageAdapter from "@slack/interactive-messages/dist/adapter";
import { InstallProvider } from "@slack/oauth";
import { WebClient } from "@slack/web-api";
import { jsxslack } from "@speee-js/jsx-slack";
import { RootConfig } from "..";
import { SharedSlackAdapter } from "../adapters/SlackAdapter";
import { SlackInstallationRecord } from "../entities/Installation";

type ActionParameters = Parameters<SlackMessageAdapter['action']>;
type OptionParameters = Parameters<SlackMessageAdapter['options']>;

function Action(id: ActionParameters[0]) {
  return function<T extends AppOutput>(target: T, property: keyof T, descriptor: PropertyDescriptor) {
    (target.actions || (target.actions = [])).push([id, target[property] as unknown as (payload: any, respond: any) => any]);
  }
}

function Options(id: OptionParameters[0]) {
  return function<T extends AppOutput>(target: T, property: keyof T, descriptor: PropertyDescriptor) {
    (target.options || (target.options = [])).push([id, target[property] as unknown as (payload: any) => any]);
  }
}

function Command(name: string) {
  return function<T extends AppOutput>(target: T, property: keyof T, descriptor: PropertyDescriptor) {
    (target.commands || (target.commands = [])).push([name, target[property] as unknown as RequestHandler]);
  }
}

function SlackEvent(name: string) {
  return function<T extends AppOutput>(target: T, property: keyof T, descriptor: PropertyDescriptor) {
    (target.eventListeners || (target.eventListeners = [])).push([name, target[property] as unknown as Function]);
  }
}

interface SlackEvent {
  type: string;
  event_ts: string;
}

interface AppHomeEvent extends SlackEvent {
  tab: string;
  user: string;
  channel: string;
}

interface AppHomeEventDetails {
  team_id: string;
  api_app_id: string;
  token: string;
  event: AppHomeEvent;
}

const HomeTab: (opts: { user: PresentiUser | null }) => any = ({ user }) => jsxslack`
  <Blocks>
    <Section>
      ${ user ? jsxslack`
        Hey there, <b>${user.userID}</b>
      ` : jsxslack`
        Sorry, it doesn't look like you've linked to Presenti yet. <a href="#">Click here</a> to do so.
      `}
    </Section>
  </Blocks>
`;

export class AppOutput extends PresenceOutput {
  interactions: SlackMessageAdapter;
  events: SlackEventAdapter;
  installer: InstallProvider;

  options: Array<Parameters<SlackMessageAdapter['options']>>;
  actions: Array<Parameters<SlackMessageAdapter['action']>>;
  commands: Array<[string, RequestHandler]>;
  eventListeners: Array<[string, Function]>;

  constructor(provider, app, private config: RootConfig) {
    super(provider, app, undefined, ['x-slack-signature', 'x-slack-request-timestamp']);

    this.interactions = createMessageAdapter(config.signingSecret);
    this.events = createEventAdapter(config.signingSecret, { includeBody: true, includeHeaders: true });
    this.installer = new InstallProvider({
      clientId: config.clientID,
      clientSecret: config.clientSecret,
      authVersion: 'v2',
      stateSecret: config.stateSecret,
      installationStore: {
        storeInstallation: async (installation) => {
          const record = SlackInstallationRecord.create({
            teamId: installation.team.id,
            userId: installation.user?.id,
            enterpriseId: installation.enterprise?.id,
            installation
          });
          await record.save();
        },
        fetchInstallation: async (InstallQuery) => {
          const record = await SlackInstallationRecord.findOne(InstallQuery);
          return record!.installation;
        }
      }
    });

    this.api.any("/slack/actions", BodyParser, this.interactions.requestListener() as any);
    this.api.any("/slack/events", BodyParser, this.events.requestListener() as any);
    this.api.get("/slack/install", async (req, res) => {
      try {
        const url = await this.installer.generateInstallUrl({
          scopes: ['chat:write', 'commands', 'users:read', 'users:write'],
          redirectUri: this.config.redirectUri
        });
  
        res.redirect(url);
      } catch {
        res.json(APIError.internal());
      }
    });
    this.api.get("/slack/link", UserLoader(false), IdentityGuardFrontend, async (req, res) => {
      try {
        const url = await this.installer.generateInstallUrl({
          userScopes: ['identity.basic'],
          scopes: [],
          redirectUri: this.config.linkRedirectUri
        });

        res.redirect(url);
      } catch {
        res.json(APIError.internal());
      }
    });

    this.api.get("/slack/oauth_redirect", async (req, res) => {
      Object.defineProperty(req, "url", {
        get() {
          return req.getUrl() + (req.getQuery() ? `?${req.getQuery()}` : '');
        }
      });

      await this.installer.handleCallback(req as any, res as any, {
        success: (_, __, ___, res: unknown) => {
          (res as PBResponse).redirect("/");
        },
        failure: (_, __, ___, res: unknown) => {
          (res as PBResponse).redirect("/");
        }
      });
    });

    this.api.get("/slack/link_redirect", UserLoader(false), IdentityGuardFrontend, async (req, res) => {
      const params = new URLSearchParams(req.getQuery());
      const code = params.get("code"), state = params.get("state");
      if (!code || !state) return res.json(APIError.badRequest("Missing code/state."));

      const client = new WebClient();
      const options = await this.installer.stateStore.verifyStateParam(new Date(), state);
      const response = await client.oauth.v2.access({
        code,
        client_id: this.config.clientID,
        client_secret: this.config.clientSecret,
        redirect_uri: options.redirectUri
      });

      if (typeof response.authed_user !== 'object' || response.authed_user === null || !("id" in response.authed_user)) return res.json(APIError.badRequest("Missing Slack user in response data"));

      await this.presentiClient.linkPlatform(OAUTH_PLATFORM.SLACK, (response.authed_user as any).id, res.user!.userID);

      res.redirect("/");
    });

    for (let [name, handler] of (this.actions || [])) {
      const options = (this.options || []).find(([ optionName ]) => {
        if (optionName instanceof RegExp && name instanceof RegExp) return String(name) === String(optionName);
        else if (typeof optionName === "string" && typeof name === "string") return name === optionName;
        else if ((typeof optionName === "object" && typeof name === "object") && !(optionName instanceof RegExp || name instanceof RegExp)) return optionName.actionId === name.actionId;
        else return false;
      });

      (options ? this.interactions.options(...options) : this.interactions).action(name, handler);
    }

    this.eventListeners.forEach(([name, listener]) => (this.events as any).on(name, (...args) => listener.call(this, ...args)));

    const commands = this.commands.reduce((acc, [name, handler]) => Object.assign(acc, {[name]: handler}), {} as Record<string, RequestHandler>);
    this.api.post("/slack/commands", BodyParser, (req, res) => {
      const { [req.body?.command?.substring(1)]: handler } = commands;
      if (!handler) return res.json(APIError.notFound("Unknown command."));
      handler(req, res, () => null, () => null);
    });
  }

  @Command("test")
  testCommand(req: PBRequest, res: PBResponse) {
    res.json(HomeTab);
  }

  @SlackEvent("app_home_opened")
  async renderHome(event: AppHomeEvent, details: AppHomeEventDetails) {
    switch (event.tab) {
      case "home":
        const data = await this.installer.authorize({ teamId: details.team_id });
        const user = await this.presentiClient.platformLookup(OAUTH_PLATFORM.SLACK, event.user);
        const web = new WebClient(data.botToken);

        await web.views.publish({
          user_id: event.user,
          view: {
            type: "home",
            blocks: HomeTab({ user })
          }
        });
    }
  }

  run() {
    return super.run();
  }

  get presentiClient() {
    return SharedSlackAdapter.client;
  }
}