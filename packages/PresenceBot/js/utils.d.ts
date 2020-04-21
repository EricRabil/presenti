import { HttpResponse } from "uWebSockets.js";
export declare function readRequest(res: HttpResponse): Promise<any>;
export declare namespace PresentiKit {
    function generatePalette(imageURL: string): Promise<string[]>;
}
