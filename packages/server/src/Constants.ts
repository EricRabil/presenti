import path from "path";

export const VIEWS_DIRECTORY = path.resolve(__dirname, "..", "views");
export const STATIC_DIRECTORY = path.resolve(__dirname, "..", "assets");

try {
  var resolved = path.resolve(require.resolve("@presenti/renderer"), "..", "..", "dist");
} catch {
  // fallback - this will make p-assets 404, but you can run the server without building a renderer
  resolved = STATIC_DIRECTORY;
}

export const PRESENTI_ASSET_DIRECTORY = resolved;
