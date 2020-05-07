import { ScopedPresenceAdapter } from "@presenti/modules";
import { RTMClient } from "@slack/rtm-api";
import { RootConfig } from "..";
import { AdapterState, PresentiAPIClient, PresenceList } from "@presenti/utils";

export var SharedSlackAdapter: SlackAdapter;

export class SlackAdapter extends ScopedPresenceAdapter {
  rtmClient: RTMClient

  constructor(config: RootConfig, public client: PresentiAPIClient) {
    super();
    SharedSlackAdapter = this;
  }

  activityForUser(id: string): Partial<import("@presenti/utils").PresenceStruct> | Partial<import("@presenti/utils").PresenceStruct>[] | Promise<import("@presenti/utils").Presence> | undefined {
    return [];
  }

  activities(): Record<string, PresenceList> | Promise<Record<string, PresenceList>> {
    return {};
  }

  run(): void | Promise<void> {
    this.state = AdapterState.RUNNING;
  }
}