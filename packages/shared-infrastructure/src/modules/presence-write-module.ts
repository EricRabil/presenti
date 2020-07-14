import { Module, ModuleOptions } from "@presenti/modules";
import { RemoteRestAPIBase } from "../structs/remote-rest-api-base";
import { RemoteWSAPIBase } from "../structs/remote-ws-api-base";

export class PresenceWriteModule extends Module {
    restAPI: RemoteRestAPIBase;
    wsAPI: RemoteWSAPIBase;

    constructor(options: ModuleOptions<any>) {
        super(options);

        this.registerAdapter(new RemoteRestAPIBase(this.app));
        this.registerAdapter(new RemoteWSAPIBase(this.app));
    }
}