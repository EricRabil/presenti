export interface SearchOptions {
    query: string;
    fields: string | string[];
    sort?: Array<string | Record<string, {order?: "asc" | "desc" | "_doc", mode?: "min" | "max" | "sum" | "avg" | "median"}>>;
    page?: number;
    raw?: boolean;
    max?: number;
}

export interface SearchResult<T> { total: number, results: T[] }