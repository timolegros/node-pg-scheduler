import { Client } from "pg";

export type TaskHandlerType = (data: any) => Promise<void>;
export type TaskHandlerMapType = Record<string, TaskHandlerType>;

export abstract class AbstractHandlerManager {
  protected taskHandlers: TaskHandlerMapType;
  protected initialized: boolean = false;

  protected constructor() {
    this.taskHandlers = {};
  }

  public abstract init(client?: Client): Promise<void>;

  // Class instances should only fetch tasks for which they have a registered handler
  public abstract registerTaskHandler(
    name: string,
    handler: TaskHandlerType
  ): Promise<boolean>;

  public abstract removeTaskHandler(name: string): Promise<boolean>;

  public abstract getTaskHandlers(): typeof this.taskHandlers;
}
