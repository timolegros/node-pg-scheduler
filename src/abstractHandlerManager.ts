import { Pool } from "pg";

import {TaskHandlerMapType, TaskHandlerType} from "./types";

export abstract class AbstractHandlerManager {
  protected taskHandlers: TaskHandlerMapType;
  protected initialized = false;

  protected constructor() {
    this.taskHandlers = {};
  }

  public abstract init(pool?: Pool): Promise<void>;

  // Class instances should only fetch tasks for which they have a registered handler
  public abstract registerTaskHandler(
    name: string,
    handler: TaskHandlerType
  ): Promise<boolean>;

  public abstract removeTaskHandler(name: string): Promise<boolean>;

  public abstract getTaskHandlers(): TaskHandlerMapType;
}