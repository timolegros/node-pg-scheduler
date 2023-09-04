import { Client, ClientConfig } from "pg";
import { createSchedulerTable } from "./pg/queries";
import { CheckInitialized } from "./util";
import { CentralizedTaskManager } from "./pg/task/centralizedTaskManager";
import {
  ExecutionMode,
  ExecutionModeType,
  TaskSchedulerOptions,
} from "./pg/types";
import { TaskHandlerType } from "./pg/handler/types";
import { CentralizedHandlerManager } from "./pg/handler/centralizedHandlerManager";
import log, { LogLevelDesc } from "loglevel";
import { TaskType } from "./pg/task/types";

export class PgTaskScheduler {
  private readonly distributed: boolean;
  private readonly handleInterval: number;
  private readonly pingInterval: number;
  private readonly executionMode: ExecutionModeType;
  private readonly logLevel: LogLevelDesc;
  private readonly client: Client;

  private concurrency: number;
  private intervalId: NodeJS.Timeout | undefined;
  private schedulerId: number | undefined;

  private taskManager: CentralizedTaskManager;
  private handlerManager: CentralizedHandlerManager;

  private initialized: boolean = false;

  // Integer ids of tasks that are set to run with setTimeout
  private timeoutTaskIds = new Set<number>();

  /**
   * Create a new PgTaskScheduler instance. The options object is used to configure the scheduler.
   * @param {Object} options - An object containing options to configure the scheduler.
   * @param {boolean} options.executionMode - Whether to execute tasks at the exact scheduled time by using setTimeout.
   * Defaults to true.
   * @param {number} options.concurrency - The number of tasks that can be executed in parallel. Defaults to 25.
   * @param {boolean} options.distributed - Whether to use a distributed or centralized handler manager. Defaults to
   * false.
   * @param {number} options.pingInterval - Interval at which to ping the scheduler table to ensure the scheduler is
   * running. Defaults to 5 minutes.
   * @param {string} options.logLevel - The log level to use for the scheduler. Defaults to 'warn'.
   * @param pgClientConfig
   */
  constructor(
    {
      executionMode,
      concurrency,
      distributed,
      handleInterval,
      pingInterval,
      logLevel,
    }: TaskSchedulerOptions,
    pgClientConfig: ClientConfig
  ) {
    // create the pg client
    this.client = new Client({
      ...pgClientConfig,
    });
    this.executionMode = executionMode || ExecutionMode.single;
    this.concurrency = concurrency || 25;
    this.distributed = distributed || false;
    this.handleInterval = handleInterval || 30000;
    this.pingInterval = pingInterval || 300000;
    this.logLevel = logLevel || "warn";
    log.setLevel(this.logLevel, false);
    this.taskManager = new CentralizedTaskManager({
      client: this.client,
      autoClearOldTasks: true,
    });

    // if (distributed) {
    //   log.info('Distributed mode is not yet supported. Using centralized mode.')
    // this.handlerManager = new DistributedHandlerManager();
    // } else {
    this.handlerManager = new CentralizedHandlerManager();
    // }
  }

  public async init() {
    log.trace("init(): Initializing scheduler");
    await this.client.connect();
    log.debug("Connected to database");

    await this.taskManager.init();
    await this.handlerManager.init();

    if (this.distributed) {
      log.trace("Initializing distributed scheduler");
      await this.client.query(createSchedulerTable);
      this.schedulerId = await this.registerScheduler();
      this.intervalId = this.infinitePingLoop();
    }

    this.initialized = true;

    if (this.executionMode === ExecutionMode.realtime) {
      await this.startRealtimeExecution();
    } else if (this.executionMode === ExecutionMode.interval) {
      await this.startIntervalExecution();
    } else if (this.executionMode === ExecutionMode.single) {
      await this.startSingleExecution();
    } else {
      throw new Error(`Invalid execution mode: ${this.executionMode}`);
    }
    log.info("Initialized scheduler");
  }

  @CheckInitialized
  private async startSingleExecution() {
    log.trace("startSingleExecution(): Starting single execution");
    const tasks = await this.taskManager.getExecutableTasks();
    const handlers = this.handlerManager.getTaskHandlers();
    log.debug(
      "Fetched tasks:",
      JSON.stringify(tasks, null, 2),
      "\n",
      "Fetched handlers:",
      JSON.stringify(Object.keys(handlers), null, 2)
    );

    for (const task of tasks) {
      if (!handlers[task.name]) {
        log.warn(`No handler registered for task ${task.id}`);
        continue;
      }
      this.executeTask(task, handlers[task.name]);
    }
    log.trace("startSingleExecution(): Finished single execution");
  }

  @CheckInitialized
  private async startIntervalExecution() {
    log.trace("startIntervalExecution(): Starting interval execution");
    await this.startSingleExecution();
    this.intervalId = setInterval(async () => {
      await this.startSingleExecution();
    }, this.handleInterval);
    log.trace("startIntervalExecution(): Finished interval execution");
  }

  @CheckInitialized
  private async startRealtimeExecution() {
    log.trace("startRealtimeExecution(): Starting realtime execution");
    await this.realtimeExecution();
    this.intervalId = setInterval(async () => {
      await this.realtimeExecution();
    }, this.handleInterval);
    log.trace("startRealtimeExecution(): Finished realtime execution");
  }

  private async realtimeExecution() {
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
        // TODO: the alternative is to always fetch all tasks and filter out the ones that are in the timeout set
        //  but only if the time set to run is now or in the future - if the time to run is in the past than execute it
        //  and remove it from the set thus preventing hanging tasks.
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

  @CheckInitialized
  private async executeTask(
    task: TaskType,
    handler: TaskHandlerType
  ): Promise<boolean> {
    log.trace(`executeTask(): Executing task ${task.id}`);
    await this.client.query("BEGIN;");
    const result = await this.client.query(
      `
      SELECT * FROM tasks
      WHERE id = $1
      FOR UPDATE SKIP LOCKED;
    `,
      [task.id]
    );

    if (result.rows.length !== 1) {
      log.info(`Task ${task.id} is already locked`);
      await this.client.query("ROLLBACK;");
      return false;
    }

    try {
      await handler(task.data);
    } catch (e) {
      log.error(`Error executing task ${task.id}`, e);
      // TODO: add max error count so we can re-execute tasks a maximum number of times?
      await this.client.query("ROLLBACK;");
      return false;
    }
    await this.client.query("COMMIT;");

    log.trace(`executeTask(): Finished executing task ${task.id}`);
    return true;
  }

  @CheckInitialized
  public async destroy() {
    log.trace("destroy(): Destroying scheduler");
    await this.client.end();
    this.initialized = false;

    if (this.distributed && this.intervalId) {
      log.trace("destroy(): Clearing interval");
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    log.trace("destroy(): Destroyed scheduler");
  }

  // Decentralized scheduler functions

  // return the interval id
  private infinitePingLoop(): NodeJS.Timeout {
    return setInterval(async () => {
      await this.client.query("SELECT 1");
    }, this.pingInterval);
  }

  private async registerScheduler(): Promise<number> {
    const result = await this.client.query(``);
    return result.rows[0].id;
  }
}
