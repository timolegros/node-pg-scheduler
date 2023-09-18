import { AbstractScheduler } from "./abstractScheduler";
import { StandAloneHandlerManager } from "../handler/standAloneHandlerManager";
import { StandAloneTaskManager } from "../task/standAloneTaskManager";
import log from "loglevel";
import { StandAloneSchedulerOptions } from "./types";
import { CheckInitialized } from "../util";

export class StandAloneScheduler extends AbstractScheduler {
  protected taskManager: StandAloneTaskManager;
  protected handlerManager: StandAloneHandlerManager;

  constructor(options: StandAloneSchedulerOptions) {
    super(
      options.pgPoolConfig,
      options.logLevel ?? "error",
      options.handleInterval,
      options.executionMode
    );

    this.handlerManager = new StandAloneHandlerManager();
    this.taskManager = new StandAloneTaskManager({
      pool: this.pool,
      clearOutdatedTasks: options.clearOutdatedTasks,
      maxTaskAge: options.maxTaskAge,
    });
  }

  public async init() {
    await this.handlerManager.init();
    await this.taskManager.init();
    this.initialized = true;
  }

  @CheckInitialized
  protected async realtimeExecution(): Promise<void> {
    log.trace("realtimeExecution(): Starting realtime execution");
    const tasks = await this.taskManager.getTasks({
      notIds: Array.from(this.timeoutTaskIds),
    });
    const handlers = this.handlerManager.getTaskHandlers();
    log.debug(
      "Fetched tasks:",
      JSON.stringify(tasks, null, 2),
      "\n",
      "Fetched handlers:",
      JSON.stringify(Object.keys(handlers), null, 2)
    );

    for (const task of tasks) {
      log.debug("Processing task:", JSON.stringify(task, null, 2));
      if (!handlers[task.name]) {
        log.warn(`No handler registered for task ${task.id}`);
        continue;
      }

      const now = Date.now();
      if (task.date.getTime() > now) {
        log.debug(`Setting timeout for task ${task.id}`);
        const timeout = task.date.getTime() - now;
        this.timeoutTaskIds.add(task.id);

        // It is important that the timeout is never cancelled. If the timeout is cancelled, the task id
        // will remain in the set thus preventing the task from being fetched in the future.
        setTimeout(async () => {
          this.timeoutTaskIds.delete(task.id);
          await this.executeTask(task, handlers[task.name]);
        }, timeout);
      } else {
        log.debug(`Executing task ${task.id} immediately`);
        // safety check to catch any hanging task ids that result from a timeout being cancelled
        this.timeoutTaskIds.delete(task.id);
        this.executeTask(task, handlers[task.name]);
      }
    }
    log.trace("realtimeExecution(): Finished realtime execution");
  }
}
