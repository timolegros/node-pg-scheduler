export enum ExecutionMode {
  single = "single",
  realtime = "realtime",
}

export type LogLevels = "trace" | "debug" | "info" | "warn" | "error";

export type ExecutionModeType = keyof typeof ExecutionMode;
