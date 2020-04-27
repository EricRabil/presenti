"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const winston_1 = __importDefault(require("winston"));
const logLevels = {
    levels: {
        emerg: 0,
        alert: 1,
        crit: 2,
        error: 3,
        warning: 4,
        notice: 5,
        info: 6,
        debug: 7
    },
    colors: {
        emerg: 'red',
        alert: 'red',
        crit: 'red',
        error: 'red',
        warning: 'yellow',
        notice: 'blue',
        info: 'green',
        debug: 'green'
    }
};
exports.log = winston_1.default.createLogger({
    levels: logLevels.levels,
    transports: [
        new winston_1.default.transports.Console({
            level: 'debug',
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format((info, opts = {}) => {
                if (info.name) {
                    info.level = `${info.level} ${chalk_1.default.magenta(info.name)}`;
                    delete info.name;
                }
                return info;
            })(), winston_1.default.format.simple())
        })
    ]
});
exports.default = exports.log;
