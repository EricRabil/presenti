import { Module, ModuleOptions } from "@presenti/modules";
import { PresenceRestAPIBase } from "../structs/presence-rest-api-base";
import { DecentralizedPresenceStream } from "../structs/presence-ws-api-base";

export class PresenceReadModule extends Module {
    restAPI: PresenceRestAPIBase;
    wsAPI: DecentralizedPresenceStream;

    constructor(options: ModuleOptions<any>) {
        super(options);

        this.restAPI = new PresenceRestAPIBase(this.provider, this.app);
        this.wsAPI = new DecentralizedPresenceStream(this.provider, this.app);
    }
}