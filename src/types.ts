export enum ExecutionMode {
  single = "single",
  interval = "interval",
  realtime = "realtime",
}

export type ExecutionModeType = keyof typeof ExecutionMode;

/**
 * concurrency: Number of tasks to run in parallel. Defaults to 25.
 * exactExecution: Whether to execute tasks at the exact time by using setTimeout
 * distributed: whether to use a distributed or centralized handler manager
 * pingInterval: interval at which to ping the scheduler table to ensure the scheduler is running
 */
export type TaskSchedulerOptions = {
  executionMode: ExecutionModeType;
  concurrency?: number;
  distributed?: boolean;
  handleInterval?: number;
  pingInterval?: number;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
};

export type CreateTaskSchedulerOptions = {
  type: string;
  options: TaskSchedulerOptions;
};
