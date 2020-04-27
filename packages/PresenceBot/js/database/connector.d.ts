export declare class Database {
    private hasChanges;
    connect(): Promise<import("typeorm").Connection>;
    get host(): string;
    set host(host: string);
    get port(): number;
    set port(port: number);
    get name(): string;
    set name(name: string);
    get username(): string | null;
    set username(username: string | null);
    get password(): string | null;
    set password(password: string | null);
}
