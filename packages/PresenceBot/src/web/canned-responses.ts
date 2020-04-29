import { PBResponse } from "../utils/web/types";

export function notFound(res: PBResponse) {
  res.writeStatus(404).render('error', { error: "The resource requested could not be found." });
}

export function notFoundAPI(res: PBResponse) {
  res.writeStatus(404).json({ error: "Unknown endpoint." });
}