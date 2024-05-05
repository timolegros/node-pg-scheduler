import { Pool, PoolConfig } from "pg";

export enum ExecutionMode {
  single = "single",
  realtime = "realtime",
}

export type ExecutionModeType = keyof typeof ExecutionMode;
export type TaskHandlerType = (data: any) => Promise<void>;
export type TaskHandlerMapType = Record<string, TaskHandlerType>;
export type StandAloneSchedulerOptions = {
  executionMode: ExecutionModeType;
  pgPoolConfig: PoolConfig;
  namespace: string;
  clearOutdatedTasks?: boolean;
  maxTaskAge?: number;
  handleInterval?: number;
};

export type DistributedSchedulerOptions = StandAloneSchedulerOptions & {
  pingInterval?: number;
};

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

export type TaskType = {
  id: number;
  date: Date;
  name: string;
  data: string;
  category?: string;
};

export type TaskManagerOptions = {
  pool: Pool;
  clearOutdatedTasks?: boolean;
  maxTaskAge?: number;
  namespace: string;
};

type AllTaskQueryOptions = {
  id: number;
  notIds: number[];
  name: string;
  namespace: string;
};
export type TaskQueryOptions = AtLeastOne<AllTaskQueryOptions>;