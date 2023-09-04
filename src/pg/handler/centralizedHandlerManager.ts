import {
  AbstractHandlerManager,
  TaskHandlerMapType,
  TaskHandlerType,
} from "./types";
import { CheckInitialized } from "../../util";

export class CentralizedHandlerManager extends AbstractHandlerManager {
  constructor() {
    super();
    this.taskHandlers = {};
  }

  public async init() {
    this.initialized = true;
  }

  // TODO: add generalized handler callback?
  // Class instances should only fetch tasks for which they have a registered handler
  @CheckInitialized
  public async registerTaskHandler(
    name: string,
    handler: TaskHandlerType
  ): Promise<boolean> {
    if (this.taskHandlers[name]) {
      return false;
    }
    this.taskHandlers[name] = handler;
    return true;
  }

  @CheckInitialized
  public async removeTaskHandler(name: string): Promise<boolean> {
    if (!this.taskHandlers[name]) {
      return false;
    }
    delete this.taskHandlers[name];
    return true;
  }

  @CheckInitialized
  public getTaskHandlers(): TaskHandlerMapType {
    return this.taskHandlers;
  }
}