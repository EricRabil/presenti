import path from "path";
import { APIError } from "@presenti/web";

export const VIEWS_DIRECTORY = path.resolve(__dirname, "..", "views");
export const STATIC_DIRECTORY = path.resolve(__dirname, "..", "assets");
export const PRESENTI_ASSET_DIRECTORY = path.resolve(require.resolve("@presenti/renderer"), "..");

export const MALFORMED_BODY = APIError.badRequest("Malformed body.");