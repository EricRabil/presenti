export declare class Database {
    connect(): Promise<import("typeorm").Connection>;
    ensureConfig(): Promise<void>;
    get config(): {
        host: string;
        port: number;
        name: string;
        username: string | null;
        password: string | null;
    };
}
