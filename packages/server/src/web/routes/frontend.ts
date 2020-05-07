import { Any, BodyParser, Get, PBRequest, PBResponse, Post, RequestHandler, RouteData, RouteDataShell } from "@presenti/web";
import fs from "fs-extra";
import path from "path";
import { TemplatedApp } from "uWebSockets.js";
import { User } from "../../database/entities";
import { CONFIG } from "../../utils/config";
import PBRestAPIBase from "../../structs/rest-api-base";
import { notFound } from "../canned-responses";
import { PRESENTI_ASSET_DIRECTORY, STATIC_DIRECTORY, VIEWS_DIRECTORY } from "../../Constants";
import { UserLoader, OAuthLoader } from "../middleware/loaders";
import { IdentityGuardFrontend } from "../middleware/guards";

/** Frontend routes */
export default class Frontend extends PBRestAPIBase {
  constructor(public readonly app: TemplatedApp) {
    super(app);
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
  @Get("/login")
  loginView(req: PBRequest, res: PBResponse) {
    res.render('login', { signup: CONFIG.registration });
  }

  /** Renders the signup page, if registration is enabled */
  @Get("/signup")
  signupView(req: PBRequest, res: PBResponse) {
    if (!CONFIG.registration) return notFound(res);
    res.render('signup');
  }

  /** Renders the change password page, if the user is signed in */
  @Get("/changepw", IdentityGuardFrontend)
  changePassword(req: PBRequest, res: PBResponse) {
    res.render('changepw');
  }

  /** Called upon change password form submission, accepts "password" and "newPassword" in the form body */
  @Post("/changepw", IdentityGuardFrontend, BodyParser)
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
  @Post("/signup", BodyParser)
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
  @Get("/logout")
  logout(req: PBRequest, res: PBResponse) {
    res.setCookie('identity', '', { maxAge: 0 });
    res.redirect('/');
  }

  /** Called upon login form submission, accepts "id" and "password" in form submission */
  @Post("/login", BodyParser)
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
  @Any("/")
  rootHandler(req: PBRequest, res: PBResponse) {
    if (!res.user) {
      res.redirect('/login');
      return;
    }

    res.redirect('/panel');
  }

  /** Renders the panel home page */
  @Get("/panel", IdentityGuardFrontend, OAuthLoader)
  panelView(req: PBRequest, res: PBResponse) {
    res.render('panel');
  }

  /** Serves assets for the presenti renderer */
  @Get("/p-assets/*")
  async presentiAssets(req: PBRequest, res: PBResponse) {
    const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
    const absolute = await Frontend.resolvePresenti(relative).catch(e => null);
    
    if (!absolute || !await fs.pathExists(absolute).catch(e => false) || !await fs.stat(absolute).then(stat => stat.isFile()).catch(e => false)) {
      return notFound(res);
    }

    await res.file(absolute);
  }

  /** Serves the page for the presenti renderer */
  @Get("/renderer")
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
  @Get("/assets/*")
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