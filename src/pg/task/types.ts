import { Client } from "pg";

export type TaskType = {
  id: number;
  date: Date;
  name: string;
  data: string;
  category?: string;
};

export type TaskManagerOptions = {
  client: Client;
  autoClearOldTasks?: boolean;
  maxTaskAge?: number;
};

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

type AllTaskQueryOptions = {
  id: number;
  notIds: number[];
  name: string;
  category: string;
};

export type TaskQueryOptions = AtLeastOne<AllTaskQueryOptions>;
