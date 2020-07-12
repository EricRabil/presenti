import { Any, BodyParser, Get, PBRequest, PBResponse, Post, RequestHandler, RouteData, RouteDataShell, Options, APIError } from "@presenti/web";
import fs from "fs-extra";
import path from "path";
import { TemplatedApp } from "uWebSockets.js";
import { User } from "@presenti/shared-db";
import { CONFIG } from "../../utils/config";
import { API, GlobalGuards } from "@presenti/modules";
import PBRestAPIBase from "../../structs/rest-api-base";
import { PRESENTI_ASSET_DIRECTORY, STATIC_DIRECTORY, VIEWS_DIRECTORY } from "../../Constants";
import { UserLoader, OAuthLoader } from "../middleware/loaders";
import { IdentityGuardFrontend } from "../middleware/guards";

/** Frontend routes */
export default class Frontend extends PBRestAPIBase {
  constructor(public readonly app: TemplatedApp) {
    super(app);
    Frontend.ensureRendererListings();
  }

  loadRoutes() {
    super.loadRoutes();

    this.app.any('/*', this.buildHandler(RouteDataShell("/*"), (req, res) => {
      res.json(APIError.notFound())
    }));
  }

  buildStack(metadata: RouteData, middleware: RequestHandler[], headers: string[] = []) {
    return super.buildStack(metadata, [UserLoader()].concat(middleware), headers.concat('authorization'));
  }

  /** Serves assets for the presenti renderer */
  @Get("/p-assets/*")
  async presentiAssets(req: PBRequest, res: PBResponse) {
    const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
    const absolute = await Frontend.resolvePresenti(relative).catch(e => null);
    
    if (!absolute || !await fs.pathExists(absolute).catch(e => false) || !await fs.stat(absolute).then(stat => stat.isFile()).catch(e => false)) {
      return res.json(APIError.notFound());
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
      host: req.getHeader('host')
    }
    res.render('presenti', options);
  }

  /** Serves static assets for the panel */
  @Get("/assets/*")
  async staticAsset(req: PBRequest, res: PBResponse) {
    const relative = req.getUrl().substring(1).split('/').slice(1).join('/');
    const absolute = Frontend.resolveStatic(relative);

    if (!absolute || !await fs.pathExists(absolute) || !await fs.stat(absolute).then(stat => stat.isFile())) {
      return res.json(APIError.notFound());
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
    await this.ensureRendererListings();

    const resolved = this.mappings[file];
    if (!resolved.startsWith(PRESENTI_ASSET_DIRECTORY)) return null;
    return resolved;
  }

  private static mappings: Record<string, string> = null!;
  
  /** Indexes the renderer module, creates convenience names mapping to renderer resources */
  static async ensureRendererListings() {
    if (this.mappings) return;
    const mappings = this.mappings = {};
    const validExtensions = ['css', 'js'];

    async function walk(parent: string = PRESENTI_ASSET_DIRECTORY) {
      const contents = await fs.readdir(parent);
      const details = contents.map(item => ({ name: item, path: path.join(parent, item) }));

      await Promise.all(details.map(async ({ name, path }) => {
        const stat = await fs.stat(path);
        
        if (!stat.isFile()) {
          return await walk(path);
        }

        const parts = name.split(".");
        const base = parts[0], ext = parts[parts.length - 1];
        
        if (!validExtensions.includes(ext)) return;

        mappings[`${base}.${ext}`] = path;
      }));
    }
    
    await walk();

    console.log(mappings);
  }
}