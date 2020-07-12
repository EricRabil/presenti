import { User } from "@presenti/shared-db";
import { hash } from "bcrypt";
import log from "@presenti/logging";

export namespace DebugKit {
    function makeid(length: number) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    const dummy = <T>(arg: T) => async () => arg;

    export async function createUsers(count: number = 500, randomPasswords: boolean = false) {
        var users: User[] = [];
        var plainText: string;
        const password = randomPasswords ? () => hash(makeid(64), 10) : dummy(await hash(plainText = makeid(64), 10))

        if (!randomPasswords) {
            log.info(`Generating ${count} user(s) with static password '${plainText!}'`);
        }

        for (let i = 0; i < count; i++) {
            const userID = makeid(10);

            users.push(User.create({ userID, passwordHash: await password(), email: `${makeid(10)}@gmail.com`, displayName: makeid(16) }));
        }

        return User.save(users);
    }
}