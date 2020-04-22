import { HttpResponse } from "uWebSockets.js";
export declare function readRequest(res: HttpResponse): Promise<any>;
import { AdapterState, Evented } from "remote-presence-utils";
export declare namespace PresentiKit {
    function generatePalette(imageURL: string): Promise<string[]>;
}
export interface AdapterStruct extends Evented {
    on(event: "updated", listener: (scope?: string) => any): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: "updated", scope?: string): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
    readonly state: AdapterState;
    run(): Promise<void>;
}
