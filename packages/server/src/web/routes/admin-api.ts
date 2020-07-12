import { API, PBRestAPIBase, GlobalGuards } from "@presenti/modules";
import { AJVGuard, Get, PBRequest, PBResponse, APIError, Patch, BodyParser, RequestHandler, Post, Delete, Put } from "@presenti/web";
import { User } from "@presenti/shared-db";
import { AdminGuard } from "../middleware/guards";
import { UserLoader } from "../middleware/loaders";
import { ResponseError } from "@elastic/elasticsearch/lib/errors";
import { SearchResult } from "@presenti/shared-db";
import { UserAPI } from "../../api/user";

const AttributesSchema = {
    type: "object",
    properties: {
        admin: {
            type: "boolean"
        },
        limited: {
            type: "boolean"
        },
        banned: {
            type: "boolean"
        },
        banReason: {
            type: "string",
            nullable: true
        }
    }
}

const UserSchema = {
    properties: {
        displayName: {
            type: "string",
            nullable: true
        },
        userID: {
            type: "string"
        },
        attributes: AttributesSchema,
        email: {
            format: "email"
        }
    },
    additionalProperties: false
}

const UserValidator = AJVGuard(UserSchema);
const AttribuesValidator = AJVGuard(AttributesSchema);

const AdminUserLoader: RequestHandler = async (req, res, next) => {
    if (!(res.loadedUser = await User.findOne({ uuid: req.getParameter(0) }))) {
        return res.json(APIError.notFound("Unknown user."));
    }
    next();
}

const BulkAdminUserLoader: RequestHandler = async (req, res, next) => {
    if (!req.body.uuids || !Array.isArray(req.body.uuids)) {
        return res.json(APIError.badRequest("The 'uuids' property must be provided in the body."));
    }
    res.loadedUsers = await User.findByIds(req.body.uuids);
    next();
}

interface APBResponse extends PBResponse {
    loadedUser: User;
    loadedUsers: User[];
}

@API("/api/admin")
@GlobalGuards(UserLoader(), AdminGuard)
export class RestAdminAPI extends PBRestAPIBase {
    @Get("/users/search")
    async search(req: PBRequest, res: PBResponse) {
        const query = req.getQuery();
        const params = new URLSearchParams(query);
        const queryString = params.get('q');
        const sort = params.get('s');
        const direction = params.get('d');
        const page = +(params.get('p') || 1);
        const max = +(params.get('l') || 10);

        try {
            var results: SearchResult<User> = queryString ? await User.searchOptimized({
                query: queryString,
                fields: ["userID.search", "displayName.search"],
                sort: sort ? [
                    direction ? { [sort]: { order: direction } } : sort as any
                ] : [],
                page,
                raw: true,
                max
            }) : {
                total: 0,
                results: []
            };

            res.json(results);
        } catch (e) {
            if (e instanceof APIError) return res.json(e);
            else res.status(500).json({ message: "Internal server error." });
            console.error(e);
        }
    }

    @Get("/user/:uuid", AdminUserLoader)
    async getUser(req: PBRequest, res: PBResponse) {
        res.json((res.loadedUser as User).sensitiveJSON(true));
    }

    @Patch("/user/:uuid", AdminUserLoader, BodyParser, UserValidator(req => req.body))
    async patchUser(req: PBRequest, res: APBResponse) {
        const { loadedUser } = res;
        const { displayName, userID, attributes, email } = req.body;

        if (typeof displayName !== "undefined") loadedUser.displayName = displayName;
        if (typeof userID      !== "undefined") loadedUser.userID = userID;
        if (typeof attributes  !== "undefined") loadedUser.attributes = attributes;
        if (typeof email       !== "undefined") loadedUser.email = email;

        await loadedUser.save();

        res.json(loadedUser.sensitiveJSON(true));
    }

    @Patch("/users/attributes", BodyParser, BulkAdminUserLoader, AttribuesValidator(req => req.body.attributes))
    async bulkPatchAttributes(req: PBRequest, res: APBResponse) {
        const { loadedUsers } = res;
        const { attributes } = req.body;

        await User.save(loadedUsers.map(user => (user.attributes = attributes, user)));

        res.json({ ok: true });
    }

    @Put("/user/:uuid/reset-password", AdminUserLoader)
    async resetPasswordForUser(req: PBRequest, res: APBResponse) {
        const { loadedUser } = res;

        res.json({ ok: true });
    }

    @Delete("/user/:uuid", AdminUserLoader)
    async deleteUser(req: PBRequest, res: APBResponse) {
        const { loadedUser } = res;

        await loadedUser.remove();

        res.json({ ok: true });
    }
}