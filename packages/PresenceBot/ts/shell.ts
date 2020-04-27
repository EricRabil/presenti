import chalk from "chalk";
import repl from "repl";
import readline, { Interface } from "readline";

export class Shell {
  constructor(private scope: any) {
  }

  run() {
    const shell = repl.start({ prompt: '(Presenti) % ' });
    for (let [key, value] of Object.entries(this.scope)) {
      shell.context[key] = value;
    }
    shell.context.shell = shell;

    shell.on('exit', () => process.exit());
  }
}