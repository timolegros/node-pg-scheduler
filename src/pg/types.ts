export type TaskSchedulerOptions = {
  concurrency?: number;
  timeoutExecution?: boolean;
  distributed?: boolean;
  backend: "pg";
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


