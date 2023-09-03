import {Client} from "pg";

export type TaskHandlerType = (data: any) => Promise<void>;
export type TaskHandlerMapType = Record<string, TaskHandlerType>;

export abstract class AbstractHandlerManager {
  protected client: Client;
  protected taskHandlers: TaskHandlerMapType
  protected initialized: boolean;

  protected constructor() {
    this.taskHandlers = {};
  }

  protected abstract async init(client: Client): Promise<void>;

  // Class instances should only fetch tasks for which they have a registered handler
  public abstract async registerTaskHandler(name: string, handler: TaskHandlerType): Promise<boolean>

  public abstract async removeTaskHandler(name: string): Promise<boolean>

  public abstract getTaskHandlers(): typeof this.taskHandlers;
}
