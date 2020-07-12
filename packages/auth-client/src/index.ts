import { AJAXClient, AJAXClientOptions, RequestOptions } from "@presenti/client";
import { PresentiUser } from "@presenti/utils";
import { AuthRoutes } from "@presenti/auth-shared";

export interface UserCreationOptions {
    displayName: string;
    email: string;
    password: string;
    userID: string;
}

var sharedInstance: AuthClient;

export default class AuthClient extends AJAXClient {
    private constructor(options: AJAXClientOptions) {
        options.ajax = Object.assign({}, (options.ajax || {}), { noAPIInject: true } as RequestOptions)
        super(options);
    }

    static setup(options: AJAXClientOptions) {
        if (sharedInstance) return new AuthClient(options);
        return sharedInstance = new AuthClient(options);
    }
    
    static get sharedInstance() {
        return sharedInstance;
    }

    createUser(body: UserCreationOptions): Promise<{ user: PresentiUser, token: string }> {
        return this.post(AuthRoutes.CREATE_USER, { body });
    }

    changePassword(uuid: string, { newPassword, password }: { newPassword: string, password: string }) {
        return this.patch(AuthRoutes.USER_PASSWORD(uuid), { body: { newPassword, password }});
    }

    apiKey(token: string, ignoreAttributes: boolean = false): Promise<{ key: string }> {
        return this.post(AuthRoutes.KEYS_CREATE, { params: ignoreAttributes ? { ignoreAttributes } : undefined, body: { token } });
    }

    createToken(userID: string, password: string): Promise<{ user: PresentiUser, token: string }> {
        return this.post(AuthRoutes.USER_TOKEN_NEW(userID), { body: { password }});
    }

    userForToken(token: string): Promise<PresentiUser> {
        return this.post(AuthRoutes.TOKENS_LOOKUP, { body: { token }});
    }

    validateApiKey(key: string): Promise<{ user: PresentiUser, firstParty: false } | { user: null, firstParty: true }> {
        return this.post(AuthRoutes.KEYS_LOOKUP, { body: { key }});
    }

    firstPartyApiKey(): Promise<{ key: string }> {
        return this.get(AuthRoutes.FIRST_PARTY_KEY);
    }
}