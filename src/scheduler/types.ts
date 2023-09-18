import { PoolConfig } from "pg";
import { ExecutionModeType, LogLevels } from "../types";

export type StandAloneSchedulerOptions = {
  executionMode: ExecutionModeType;
  pgPoolConfig: PoolConfig;
  logLevel?: LogLevels;
  clearOutdatedTasks?: boolean;
  maxTaskAge?: number;
  handleInterval?: number;
};

export type DistributedSchedulerOptions = StandAloneSchedulerOptions & {
  pingInterval?: number;
};
