import {AbstractHandlerManager} from "../abstracts/abstractHandlerManager";
import {TaskHandlerMapType, TaskHandlerType} from "../types";
import {mustBeInitialized} from "../util";

export class StandAloneHandlerManager extends AbstractHandlerManager {
  constructor({ namespace}: { namespace: string }) {
    super({ namespace });
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
    mustBeInitialized(this.initialized, this.constructor.name);

    if (this.taskHandlers[name]) {
      return false;
    }
    this.taskHandlers[name] = handler;
    return true;
  }

  public async removeTaskHandler(name: string): Promise<boolean> {
    mustBeInitialized(this.initialized, this.constructor.name);

    if (!this.taskHandlers[name]) {
      return false;
    }
    delete this.taskHandlers[name];
    return true;
  }

  public getTaskHandlers(): TaskHandlerMapType {
    mustBeInitialized(this.initialized, this.constructor.name);

    return this.taskHandlers;
  }
}
