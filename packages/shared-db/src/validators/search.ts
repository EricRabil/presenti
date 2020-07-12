import { SearchOptions } from "../types/search";

function isValidSortOptions(obj: unknown): obj is SearchOptions["sort"] {
    return typeof obj === "object"
        && obj !== null
        && Array.isArray(obj)
        && obj.every(entry => {
            if (typeof entry === "string") return true;
            const entries: [string, string][] = Object.values(entry).flatMap(obj => Object.entries(obj as any));
            if (entries.length === 0) return false;

            return entries.every(([key, value]) => {
                switch (key) {
                    case "order":
                        return ["asc", "desc", "_doc"].includes(value as any);
                    case "mode":
                        return ["min", "max", "sum", "avg", "median"].includes(value as any);
                    default:
                        return false;
                }
            });
        });
}

export function isValidSearchOptions(obj: unknown): obj is SearchOptions {    
    return typeof obj === "object"
        && obj !== null
        && typeof obj["query"] === "string"
        && (typeof obj["fields"] === "string" || (typeof obj["fields"] === "object" && Array.isArray(obj["fields"])))
        && (typeof obj["sort"] === "undefined" || (
            (typeof obj["sort"] === "object" && Array.isArray(obj["sort"]))
          && isValidSortOptions(obj["sort"])
        ));
}