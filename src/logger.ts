import {Logger, pino } from "pino";

const node_env = process.env.NODE_ENV;

const formatFilename = (name: string) => {
  const t = name.split('/');
  return t[t.length - 1];
};

export function logger(...ids: [string, ...string[]]): Logger {
  return pino({
    level: 'debug',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
      bindings: (bindings) => {
        return {
          level: bindings.level,
          time: bindings.time,
          hostname: bindings.hostname,
          pid: bindings.pid,
          filename: node_env === 'production' ? bindings.name : undefined,
          name: node_env !== 'production' ? bindings.name : undefined,
          ids: ids.length > 1 ? ids.slice(1) : undefined,
        };
      },
    },
    name: formatFilename(ids[0]),
  }, pino.transport({
    target: 'pino-pretty',
    options: {
      destination: 1, // STDOUT
      ignore: 'pid,hostname',
      errorLikeObjectKeys: ['e', 'err', 'error'],
      sync: node_env === 'test',
      colorizeObjects: false,
      singleLine: true,
    },
  }));
}