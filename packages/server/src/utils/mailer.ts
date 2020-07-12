import mail, { MailDataRequired } from "@sendgrid/mail";
import fetch from "node-fetch";

export namespace Mailer {
    type MailData = Omit<MailDataRequired, "from"> & Partial<Pick<MailDataRequired, "from">>;
    const baseURL = process.env.MAILER_URL || "http://127.0.0.1:8443";

    const sendMailURL = `${baseURL}/send/mail`;

    /** POSTs a send action to the mailer service */
    export async function send(data: MailData | MailData[]): Promise<{ ok: boolean }> {
        const payload = JSON.stringify(data);

        return await fetch(sendMailURL, { body: payload, headers: { 'Content-Type': 'application/json' }, method: "post" } ).then(r => r.json() as Promise<{ ok: boolean }>);
    }
    
    export async function test() {
        await Mailer.send({ to: { email: 'ericjrabil@gmail.com' }, subject: 'Fuck You <3', html: '<h1>Hey!! Die.</h1>' });
    }
}