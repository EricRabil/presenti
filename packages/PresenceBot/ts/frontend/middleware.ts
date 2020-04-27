import qs from "querystring";
import { RequestHandler } from "./types";
import { SecurityKit } from "../security";
import { User } from "../database/entities";
import { FIRST_PARTY_SCOPE } from "../structs/socket-api-adapter";

export const IdentityGuard: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.writeStatus(401).json({ e: 401, msg: "Invalid identity token." });
    return next(true);
  }
  next();
}

export const IdentityGuardFrontend: RequestHandler = async (req, res, next) => {
  if (!res.user) {
    res.render('login', { error: 'You must be logged in to perform this action.' });
    return next(true);
  }
  next();
}

export const FirstPartyGuard: RequestHandler = async (req, res, next) => {
  const authorization = req.getHeader('authorization');
  if (!authorization || (await SecurityKit.validateApiKey(authorization)) !== FIRST_PARTY_SCOPE) {
    res.writeStatus(403).json({ msg: "You are not authorized to access this endpoint." });
    return next(true);
  }
  next();
}

function uintToString(uintArray: Uint8Array) {
  var encodedString = String.fromCharCode.apply(null, uintArray as any),
      decodedString = decodeURIComponent(escape(encodedString));
  return decodedString;
}

export const BodyParser: RequestHandler = async (req, res, next) => {
  const mime = req.getHeader('content-type');

  const data = req.body;

  console.log(data);

  switch (mime) {
    case 'application/x-www-form-urlencoded': {
      req.body = qs.parse(data)
      break;
    }
    case 'application/json': {
      req.body = JSON.parse(data);
      break;
    }
  }

  next();
}