import { RequestHandler } from "../utils/web/types";
import { User } from "../database/entities";
import { SecurityKit } from "../utils/security";

export const UserLoader: (includeAuthorization?: boolean) => RequestHandler = includeAuth => async (req, res, next) => {
  if (req.cookie('identity')) {
    const user = await User.userForToken(req.cookie('identity')!) as User;
    if (!includeAuth && !(user instanceof User)) {
      return next();
    }
    res.user = await User.userForToken(req.cookie('identity')!) as User;
  }
  else if (includeAuth && req.getHeader('authorization')) res.user = await SecurityKit.validateApiKey(req.getHeader('authorization')) as User;
  next();
}