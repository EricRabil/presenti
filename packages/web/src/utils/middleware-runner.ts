import { APIError } from "@presenti/utils";
import { PBRequest, PBResponse, RequestHandler, RouteData } from "./types";
import params from "./normalizers/params";
import body from "./normalizers/body";
import logger from "@presenti/logging";

class MiddlewareTimeoutError extends Error { }

/**
 * Runs a stack of middleware with the given request and response
 * @param req request object
 * @param res response object
 * @param middleware middleware stack
 */
export default async function runMiddleware(metadata: RouteData, req: PBRequest, res: PBResponse, middleware: RequestHandler[]) {
    // load body data
    const parameters = params(req, metadata.path);
    req.body = req.rawBody = await body(req, res);
    req.getParameter = (index: number) => parameters[index];

    for (let fn of middleware) {
        let didComplete = false;
        try {
            const stop: any = await new Promise(async (resolve, reject) => {
                try {
                    if (middleware.indexOf(fn) !== (middleware.length - 1)) {
                        /** Halts execution if a middleware takes longer than 2.5s */
                        setTimeout(() => {
                            if (didComplete || res._ended) return;
                            res.writeStatus(502).json({ error: "Execution timeout." });
                            reject(new MiddlewareTimeoutError('Middleware did not complete within the timeout.'));
                        }, 2500);
                        await fn(req, res, resolve, reject);
                    } else {
                        /** Final handler in stack */
                        await fn(req, res, () => null, () => null);
                        resolve();
                    }
                } catch (e) {
                    reject(e);
                }
            });
            didComplete = true;

            if (stop) {
                return;
            }
        } catch (e) {
            didComplete = true;
            if (e instanceof APIError) {
                return res.json(e);
            }
            logger.error(`Unhandled error during route handling`);
            console.error(e);
            return;
        }
    }
}