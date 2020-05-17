import { PBResponse, APIError } from "@presenti/web";

/** Renders a 404 error page */
export function notFound(res: PBResponse) {
  res.writeStatus(404).render('error', { error: "The resource requested could not be found." });
}

/** Returns a 404 error response */
export function notFoundAPI(res: PBResponse) {
  res.json(APIError.notFound("Unknown endpoint."));
}