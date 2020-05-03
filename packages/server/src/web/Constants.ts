import path from "path";

export const VIEWS_DIRECTORY = path.resolve(__dirname, "..", "..", "views");
export const STATIC_DIRECTORY = path.resolve(__dirname, "..", "..", "assets");
export const PRESENTI_ASSET_DIRECTORY = path.resolve(require.resolve("@presenti/renderer"), "..", "..");