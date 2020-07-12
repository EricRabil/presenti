import { RemoteWSAPIBase } from "@presenti/shared-infrastructure";
import { DetachedPresenceProvider } from "../types";
import { TemplatedApp } from "uWebSockets.js";

export class DetachedRemoteWSAPI extends RemoteWSAPIBase {
    constructor(protected provider: DetachedPresenceProvider, app: TemplatedApp) {
        super(app);
    }

    emit(event: string, scope: string) {
        switch (event) {
            case "updated":
                this.provider.presences.set(scope, this.activityForUser(scope));
            default:
                break;
        }

        return true;
    }
}