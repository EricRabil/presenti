import cors from "cors";
import qs from "querystring";
import { RequestHandler } from "./types";

/** Parses raw body content based on the request mime type */
export const BodyParser: RequestHandler = async (req, res, next) => {
  const mime = req.getHeader('content-type');

  const data = req.body;

  switch (mime.split(';')[0]) {
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

export const CORSMiddleware: RequestHandler = cors({
  origin: (origin, cb) => cb(null, true),
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: ['content-type', 'authorization'],
  optionsSuccessStatus: 200
}) as any as RequestHandler;