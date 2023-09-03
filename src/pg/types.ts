/**
 * concurrency: Number of tasks to run in parallel. Defaults to 25.
 * exactExecution: Whether to execute tasks at the exact time by using setTimeout
 * distributed: whether to use a distributed or centralized handler manager
 * pingInterval: interval at which to ping the scheduler table to ensure the scheduler is running
 */
export type TaskSchedulerOptions = {
  concurrency?: number;
  exactExecution?: boolean;
  distributed?: boolean;
  pingInterval?: number;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
};

export type CreateTaskSchedulerOptions = {
  type: string;
  options: TaskSchedulerOptions;
};

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

type AllTaskQueryOptions = {
  id: number;
  name: string;
  category: string;
};

export type TaskQueryOptions = AtLeastOne<AllTaskQueryOptions>;


