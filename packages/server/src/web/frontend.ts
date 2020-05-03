import fs from "fs-extra";
import path from "path";
import { TemplatedApp } from "uWebSockets.js";
import { CONFIG } from "../utils/config";
import { User } from "../database/entities";
import RestAPIBase, { Route, RouteDataShell } from "../structs/rest-api-base";
import { BodyParser } from "../utils/web/shared-middleware";
import { PBRequest, PBResponse, RequestHandler } from "../utils/web/types";
import { notFound } from "./canned-responses";
import { UserLoader } from "./loaders";
import { IdentityGuard, IdentityGuardFrontend, FirstPartyGuard } from "./middleware";
import { API_ROUTES } from "@presenti/utils";
import { RouteData } from "../utils/web/utils";
import { VIEWS_DIRECTORY, PRESENTI_ASSET_DIRECTORY, STATIC_DIRECTORY } from "./Constants";

/** Frontend routes */
export default class Frontend extends RestAPIBase {
  constructor(public readonly app: TemplatedApp) {
    super(app, VIEWS_DIRECTORY);
  }

  loadRoutes() {
    super.loadRoutes();

    this.app.any('/*', this.buildHandler(RouteDataShell("/*"), (req, res) => {
      notFound(res);
    }));
  }

  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(metadata, [UserLoader()].concat(middleware), headers.concat('authorization'));
  }

  /** Renders the login page */
  @Route("/login", "get")
  loginView(req: PBRequest, res: PBResponse) {
    res.render('login', { signup: CONFIG.registration });
  }

  /** Renders the signup page, if registration is enabled */
  @Route("/signup", "get")
  signupView(req: PBRequest, res: PBResponse) {
    if (!CONFIG.registration) return notFound(res);
    res.render('signup');
  }

  /** Renders the change password page, if the user is signed in */
  @Route("/changepw", "get", IdentityGuardFrontend)
  changePassword(req: PBRequest, res: PBResponse) {
    res.render('changepw');
  }

  /** Called upon change password form submission, accepts "password" and "newPassword" in the form body */
  @Route("/changepw", "post", IdentityGuardFrontend, BodyParser)
  async changePasswordComplete(req: PBRequest, res: PBResponse) {
    const fail = (msg: string) => res.render('changepw', { error: msg });
    if (!req.body || !req.body.password || !req.body.newPassword) {
      return fail('Please fill out all required fields.');
    }

    const { password, newPassword } = req.body;
    if (!await res.user!.checkPassword(password)) {
      return fail('Please enter the correct old password.');
    }

    await res.user!.setPassword(newPassword);
    await res.user!.save();
    
    res.render('changepw', { message: 'Your password has been changed. All existing tokens have been invalidated.' });
  }

  /** Called upon signup form submission, accepts "id" and "password" in the form body */
  @Route("/signup", "post", BodyParser)
  async signupComplete(req: PBRequest, res: PBResponse) {
    if (!CONFIG.registration) return notFound(res);
    const fail = (msg: string) => res.render('signup', { error: msg });
    if (!req.body || !req.body.id || !req.body.password) {
      return fail('Please fill out all required fields.');
    }

    const { id: userID, password } = req.body;
    let user = await User.findOne({ userID });
    if (user) return fail("A user with that ID already exists. Please select a different one.");

    user = await User.createUser(userID, password);
    await user.save();

    const token = await user.token(password);
    if (!token) return fail("Sorry, we couldn't finish logging you in.");

    res.setCookie('identity', token, { httpOnly: true });
    res.redirect('/');
  }

  /** Called to sign out the user */
  @Route("/logout", "get")
  logout(req: PBRequest, res: PBResponse) {
    res.setCookie('identity', '', { maxAge: 0 });
    res.redirect('/');
  }

  /** Called upon login form submission, accepts "id" and "password" in form submission */
  @Route("/login", "post", BodyParser)
  async loginComplete(req: PBRequest, res: PBResponse) {
    const fail = () => res.render('login', { error: 'Invalid credentials.' });
    if (!req.body || !req.body.id || !req.body.password) {
      return fail();
    }

    const { id: userID, password } = req.body;
    const user = await User.findOne({ userID });
    if (!user) return fail();

    const token = await user.token(password);
    if (!token) return fail();

    const redirect = req.cookie('redirect');
    res.setCookie('identity', token, { httpOnly: true });
    res.setCookie('redirect', '', { maxAge: 0 });

    console.log(redirect);

    res.redirect(redirect || '/');
  }

  /** Renders the panel if signed in, and the login page otherwise */
  @Route("/", "any")
  rootHandler(req: PBRequest, res: PBResponse) {
    if (!res.user) {
      res.redirect('/login');
      return;
    }

    res.redirect('/panel');
  }

  /** Renders the panel home page */
  @Route("/panel", "get", IdentityGuardFrontend)
  panelView(req: PBRequest, res: PBResponse) {
    res.render('panel');
  }

  /** Serves assets for the presenti renderer */
  @Route("/p-assets/*", "get")
  async presentiAssets(req: PBRequest, res: PBResponse) {
    const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
    const absolute = await Frontend.resolvePresenti(relative).catch(e => null);
    
    if (!absolute || !await fs.pathExists(absolute).catch(e => false) || !await fs.stat(absolute).then(stat => stat.isFile()).catch(e => false)) {
      return notFound(res);
    }

    await res.file(absolute);
  }

  /** Serves the page for the presenti renderer */
  @Route("/renderer", "get")
  renderer(req: PBRequest, res: PBResponse) {
    const params = new URLSearchParams(req.getQuery());
    const options = {
      noCSS: params.has('nocss'),
      scope: params.get('scope'),
      host: `ws${CONFIG.web.host}/presence/`
    }
    res.render('presenti', options);
  }

  /** Serves static assets for the panel */
  @Route("/assets/*", "get")
  async staticAsset(req: PBRequest, res: PBResponse) {
    const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
    const absolute = Frontend.resolveStatic(relative);

    if (!absolute || !await fs.pathExists(absolute) || !await fs.stat(absolute).then(stat => stat.isFile())) {
      return notFound(res);
    }

    await res.file(absolute);
  }

  /** Resolves template files */
  static resolve(file: string) {
    if (!file.endsWith('.pug')) file = `${file}.pug`;
    return path.resolve(VIEWS_DIRECTORY, file);
  }

  /** Resolves static assets */
  static resolveStatic(file: string) {
    const resolved = path.resolve(STATIC_DIRECTORY, file);
    if (!resolved.startsWith(STATIC_DIRECTORY)) return null;
    return resolved;
  }

  /** Resolves presenti-renderer assets */
  static async resolvePresenti(file: string) {
    let resolved = path.resolve(PRESENTI_ASSET_DIRECTORY, file);
    if (!resolved.startsWith(PRESENTI_ASSET_DIRECTORY)) return null;
    let [ name, subdir ] = resolved.split('/').reverse();
    if (subdir !== 'js' && subdir !== 'css') return null;
    const contents = await fs.readdir(path.resolve(PRESENTI_ASSET_DIRECTORY, subdir));
    const [ prefix ] = name.split('.');
    name = contents.find(c => c.split('.')[0] === prefix)!;
    if (!name) return null;
    return path.resolve(PRESENTI_ASSET_DIRECTORY, subdir, name);
  }
}