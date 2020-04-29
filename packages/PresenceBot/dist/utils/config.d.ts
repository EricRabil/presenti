export interface ConfigurationStruct {
    port: number;
    registration: boolean;
    crypto: {
        jwtSecret: string | null;
        firstPartyKey: string | null;
    };
    discord: {
        clientID: string;
        clientSecret: string;
    } | null;
    web: {
        host: string;
    };
    db: {
        host: string;
        port: number;
        name: string;
        username: string | null;
        password: string | null;
    };
}
export declare const CONFIG_PATH: string;
export declare const CONFIG: ConfigurationStruct;
export declare const saveConfig: () => Promise<import("winston").Logger>;
