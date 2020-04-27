import { RequestHandler } from "../web/types";
import { User } from "../database/entities";

export const UserLoader: RequestHandler = async (req, res, next) => {
  res.user = await User.userForToken(req.cookie('identity')!) as User;
  next();
}