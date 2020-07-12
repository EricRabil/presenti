import repl from "repl";
import { SharedPresenceService } from "..";

/** Wrapper for Node.JS REPL */
export class Shell {
  constructor(private scope: any) {
  }

  /** Initialize the REPL */
  run() {
    const shell = repl.start({ prompt: '(Presenti) % ' });
    for (let [key, value] of Object.entries(this.scope)) {
      shell.context[key] = value;
    }
    shell.context.__dirname = __dirname;
    shell.context.shell = shell;

    shell.on('exit', () => SharedPresenceService.cleanup());
  }
}