import { PBResponse, APIError } from "@presenti/web";

/** Returns a 404 error response */
export function notFoundAPI(res: PBResponse) {
  res.json(APIError.notFound("Unknown endpoint."));
}