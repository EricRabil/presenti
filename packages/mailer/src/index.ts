import { App } from "uWebSockets.js";
import { RestAPIBase, Post, BodyParser, PBRequest, PBResponse, Get, Any } from "@presenti/web";
import sendgrid, { MailDataRequired } from "@sendgrid/mail";
import log from "@presenti/logging";

const port = +process.env.PORT! || 8443;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "no-reply@presenti.app";

sendgrid.setApiKey(SENDGRID_API_KEY);

export class MailerService extends RestAPIBase {
    log = log.child({ name: "Mailer" });

    constructor() {
        super(App());
    }

    @Post("/send/mail", BodyParser)
    async sendMail(req: PBRequest, res: PBResponse) {
        this.log.info('processing send request');

        let data = req.body as MailDataRequired | MailDataRequired[];

        if (!Array.isArray(data)) data = [data];
        data = data.map((data) => {
            if (!data.from) data.from = {
                email: "no-reply@presenti.app",
                name: "Presenti"
            };
            
            return data;
        });

        const [ result, ...results ] = await sendgrid.send(data);

        let { statusCode, body } = result;

        if (statusCode > 299) {
            this.log.warn('unsuccessful send request', { status: statusCode, body });
        }

        res.status(statusCode).json({ ok: statusCode < 299 });
    }
    
    @Any("*")
    async failover(req: PBRequest, res: PBResponse) {
        res.status(404).json({ error: "Unknown resource.", code: 404 });
    }

    run() {
        super.run();
        this.app.listen('0.0.0.0', port, () => {
            this.log.info(`running at 0.0.0.0:${port}`);
        });
    }
}