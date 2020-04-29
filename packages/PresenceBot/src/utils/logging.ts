import chalk from "chalk";
import winston from "winston";

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
}

export const log = winston.createLogger({
  levels: logLevels.levels,
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format((info, opts = {}) => {
          if (info.name) {
            info.level = `${info.level} ${chalk.magenta(info.name)}`;
            info.name = undefined;
          }

          return info;
        })(),
        winston.format.simple()
      )
    })
  ]
});

export default log;
