import { PresenceOutput, PresenceProvider, API } from "@presenti/modules";
import { Get, PBRequest, PBResponse, RestAPIBase } from "@presenti/web";
import { TemplatedApp } from "uWebSockets.js";

@API("/api/presence")
class RestAPI extends RestAPIBase {
  constructor(app: TemplatedApp, public readonly output: PresenceOutput) {
    super(app);
  }

  @Get("/:id")
  async getPresence(req: PBRequest, res: PBResponse) {
    const scope = req.getParameter(0);

    res.json(await this.output.payload(scope));
  }
}

export class PresenceRestAPIBase extends PresenceOutput {
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