import {AbstractHandlerManager} from "../abstractHandlerManager";
import {TaskHandlerMapType, TaskHandlerType} from "../types";

export class StandAloneHandlerManager extends AbstractHandlerManager {
  constructor() {
    super();
    this.taskHandlers = {};
  }

  public async init() {
    this.initialized = true;
  }

  // TODO: add generalized handler callback?
  // Class instances should only fetch tasks for which they have a registered handler
  public async registerTaskHandler(
    name: string,
    handler: TaskHandlerType
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Class is not initialized!')
    }

    if (this.taskHandlers[name]) {
      return false;
    }
    this.taskHandlers[name] = handler;
    return true;
  }

  public async removeTaskHandler(name: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Class is not initialized!')
    }

    if (!this.taskHandlers[name]) {
      return false;
    }
    delete this.taskHandlers[name];
    return true;
  }

  public getTaskHandlers(): TaskHandlerMapType {
    if (!this.initialized) {
      throw new Error('Class is not initialized!')
    }

    return this.taskHandlers;
  }
}
