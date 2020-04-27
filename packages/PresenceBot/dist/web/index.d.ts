import { TemplatedApp } from "uWebSockets.js";
import Frontend from "./frontend";
import PresentiAPI from "./api";
export declare namespace WebRoutes {
    function initialize(app: TemplatedApp): {
        frontend: Frontend;
        api: PresentiAPI;
    } | undefined;
}
