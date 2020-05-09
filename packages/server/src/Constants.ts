import path from "path";
import { APIError } from "@presenti/web";

export const VIEWS_DIRECTORY = path.resolve(__dirname, "..", "views");
export const STATIC_DIRECTORY = path.resolve(__dirname, "..", "assets");

try {
  var resolved = path.resolve(require.resolve("@presenti/renderer"), "..");
} catch {
  // fallback - this will make p-assets 404, but you can run the server without building a renderer
  resolved = STATIC_DIRECTORY;
}

export const PRESENTI_ASSET_DIRECTORY = resolved;

export const MALFORMED_BODY = APIError.badRequest("Malformed body.");