import { Pool } from "pg";

import {TaskHandlerMapType, TaskHandlerType} from "../types";
import {Base} from "../standAlone/base";

export abstract class AbstractHandlerManager extends Base {
  protected taskHandlers: TaskHandlerMapType;

  protected constructor({ namespace }: { namespace: string }) {
    super({ namespace });
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