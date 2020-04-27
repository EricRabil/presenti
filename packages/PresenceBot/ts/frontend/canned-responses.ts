import { PBResponse } from "./types";

export function notFound(res: PBResponse) {
  res.writeStatus(404).render('error', { error: "The resource requested could not be found." });
}