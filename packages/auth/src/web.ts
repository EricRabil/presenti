import log from "@presenti/logging";
import { Get, PBRequest, PBResponse, Post, RestAPIBase, AJVGuard, APIError, RequestHandler, BodyParser, Patch } from "@presenti/web";
import { AuthRoutes } from "@presenti/auth-shared";
import uws from "uWebSockets.js";
import { CONFIG } from "./utils/config";
import { UserSecurity, SecurityKit } from "./utils/security";
import { User } from "@presenti/shared-db";
import { FIRST_PARTY_SCOPE } from "@presenti/utils";

const string = { type: "string" };

interface APBResponse extends PBResponse {
    user: User;
}

const NoOptionalAllStrings = (properties: string[]) => ({
    required: properties,
    properties: properties.reduce((acc, c) => Object.assign(acc, { [c]: string }), {}),
    additionalProperties: false
});

const StrictStringBodyValidator = (props: string[]) => AJVGuard(NoOptionalAllStrings(props))(req => req.body);

const UserLoader: (extractor?: (req: PBRequest) => Partial<User>) => RequestHandler = (extractor = (req) => ({ uuid: req.getParameter(0) })) => async (req, res, next) => {
    const uuid = req.getParameter(0);

    const user = await User.findOne({ uuid });

    if (!user) throw APIError.notFound("Unknown user.");

    res.user = user;
}

const SignupValidator = StrictStringBodyValidator(["displayName", "email", "password", "userID"]);
const CreateTokenValidator = StrictStringBodyValidator(["password"]);
const TokenValidator = StrictStringBodyValidator(["token"]);
const APIKeyValidator = StrictStringBodyValidator(["key"]);
const ChangePasswordValidator = StrictStringBodyValidator(["password", "newPassword"]);

export class AuthWebService extends RestAPIBase {
    constructor() {
        super(uws.App());
    }

    /** User.createUser */
    @Post(AuthRoutes.CREATE_USER, BodyParser, SignupValidator)
    async createUser(req: PBRequest, res: PBResponse) {
        const { body } = req;

        const user = await UserSecurity.createUser(body);
        const token = await SecurityKit.token(user.userID, body.password);
        
        res.json({
            user,
            token
        });
    }

    @Patch(AuthRoutes.USER_PASSWORD(":uuid"), BodyParser, ChangePasswordValidator)
    async changePassword(req: PBRequest, res: PBResponse) {
        const uuid = req.getParameter(0);
        const { newPassword, password } = req.body;

        res.json(await UserSecurity.changePassword(uuid, { newPassword, password }));
    }

    /** User.apiKey() */
    @Post(AuthRoutes.KEYS_CREATE, BodyParser, TokenValidator)
    async apiKey(req: PBRequest, res: PBResponse) {
        const { token } = req.body;
        const { ignoreAttributes } = req.getSearch();

        res.json(await UserSecurity.apiKey(token, !!ignoreAttributes));
    }

    /** User.token(password) */
    @Post(AuthRoutes.USER_TOKEN_NEW(":userID"), BodyParser, CreateTokenValidator)
    async createToken(req: PBRequest, res: PBResponse) {
        const { body: { password } } = req;
        const userID = req.getParameter(0);

        res.json(await SecurityKit.token(userID, password));
    }

    /** User.userForToken(token) */
    @Post(AuthRoutes.TOKENS_LOOKUP, BodyParser, TokenValidator)
    async userForToken(req: PBRequest, res: PBResponse) {
        const { token } = req.body;

        res.json(await UserSecurity.userForToken(token));
    }

    /** Security.validateApiKey(token) */
    @Post(AuthRoutes.KEYS_LOOKUP, BodyParser, APIKeyValidator)
    async validateApiKey(req: PBRequest, res: PBResponse) {
        const { key } = req.body;

        res.json(await SecurityKit.validateApiKey(key));
    }

    @Get(AuthRoutes.FIRST_PARTY_KEY)
    async firstPartyKey(req: PBRequest, res: PBResponse) {
        const key = await SecurityKit.firstPartyApiKey();

        res.json({ key });
    }

    log = log.child({ name: "AuthWebService" });

    run() {
        super.run();

        this.app.listen('0.0.0.0', CONFIG.web.port, () => {
            this.log.info('Ready for connections.');
        });
    }
}