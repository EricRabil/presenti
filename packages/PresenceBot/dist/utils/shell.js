"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const repl_1 = __importDefault(require("repl"));
class Shell {
    constructor(scope) {
        this.scope = scope;
    }
    run() {
        const shell = repl_1.default.start({ prompt: '(Presenti) % ' });
        for (let [key, value] of Object.entries(this.scope)) {
            shell.context[key] = value;
        }
        shell.context.shell = shell;
        shell.on('exit', () => process.exit());
    }
}
exports.Shell = Shell;
