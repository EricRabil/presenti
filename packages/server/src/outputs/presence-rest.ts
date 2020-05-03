import { PresenceOutput, PresenceProvider } from "../structs/output";
import { TemplatedApp } from "uWebSockets.js";
import { RestAPIBase, Get, PBRequest, PBResponse } from "@presenti/web";
import PBRestAPIBase from "../web/api/foundation.util";

class RestAPI extends PBRestAPIBase {
  constructor(app: TemplatedApp, public readonly output: PresenceOutput) {
    super(app);
  }

  @Get("/presence/:id")
  async getPresence(req: PBRequest, res: PBResponse) {
    const scope = req.getParameter(0);

    res.json(await this.output.payload(scope));
  }
}

export class PresenceRESTOutput extends PresenceOutput {
  api: RestAPI;

  constructor(provider: PresenceProvider, app: TemplatedApp) {
    super(provider, app, []);

    this.api = new RestAPI(app, this);
  }

  async run() {
    this.api.run();
    await super.run();
  }
}