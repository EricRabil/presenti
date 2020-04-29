/** Source https://github.com/nanoexpress/nanoexpress/blob/f927302f80e4da045be7b6e4de3539fe6c8d8567/src/normalizers/params.js */

import { HttpRequest } from "uWebSockets.js";

const PARAMS_REGEX = /:([A-Za-z0-9_-]+)/g;

export default (req: HttpRequest, template: string) => {
  const rawPath = template;
  const params: string[] = [];

  if (rawPath.indexOf(':') !== -1) {
    const paramsMatch = rawPath.match(PARAMS_REGEX);

    if (paramsMatch) {
      for (let i = 0, len = paramsMatch.length; i < len; i++) {
        params[i] = req.getParameter(i);
      }
    }
  }

  return params;
};