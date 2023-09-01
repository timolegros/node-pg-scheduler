import {CheckInitialized} from "./util";

export type TaskHandler = (data: string) => Promise<void>;

export abstract class TaskHandlerManager {
  abstract initialized: boolean;

  protected taskHandlers: Record<String, any>;

    protected constructor() {
        this.taskHandlers = {};
    }

  // Class instances should only fetch tasks for which they have a registered handler
  @CheckInitialized
  public async registerTaskHandler() {}

  @CheckInitialized
  public async removeTaskHandler() {}

  @CheckInitialized
  public async getTaskHandlers() {}
}
