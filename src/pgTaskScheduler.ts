import { Client, ClientConfig } from "pg";
import {createSchedulerTable, createTasksTable} from "./pg/queries";
import { CheckInitialized } from "./util";
import { TaskManager } from "./pg/taskManager";
import { TaskSchedulerOptions } from "./pg/types";
import {AbstractHandlerManager} from "./pg/handler/types";
import { CentralizedHandlerManager } from "./pg/handler/centralizedManager";
import { DistributedHandlerManager } from "./pg/handler/distributedManager";
import log, {LogLevelDesc} from 'loglevel';

export class PgTaskScheduler {
  private readonly distributed: boolean;
  private readonly pingInterval: number;
  private readonly logLevel: LogLevelDesc;

  private concurrency: number = 0;
  private timeoutExecution: boolean;
  private intervalId: number;
  private schedulerId: number;

  private client: Client;
  private taskManager: TaskManager;
  private handlerManager: AbstractHandlerManager;

  protected initialized: boolean = false;


  /**
   * Create a new PgTaskScheduler instance. The options object is used to configure the scheduler.
   * @param {Object} options - An object containing options to configure the scheduler.
   * @param {number} options.concurrency - The number of tasks that can be executed in parallel. Defaults to 25.
   * @param {boolean} options.exactExecution - Whether to execute tasks at the exact scheduled time by using setTimeout.
   * Defaults to true.
   * @param {boolean} options.distributed - Whether to use a distributed or centralized handler manager. Defaults to
   * false.
   * @param {number} options.pingInterval - Interval at which to ping the scheduler table to ensure the scheduler is
   * running. Defaults to 5 minutes.
   * @param {string} options.logLevel - The log level to use for the scheduler. Defaults to 'warn'.
   */
  constructor({
    concurrency,
    exactExecution,
    distributed,
    pingInterval,
    logLevel,
  }?: TaskSchedulerOptions) {
    this.timeoutExecution = exactExecution || true;
    this.concurrency = concurrency || 25;
    this.distributed = distributed || false;
    this.pingInterval = pingInterval || 300000;
    this.logLevel = logLevel || 'warn';
    log.setLevel(this.logLevel, false);
    this.taskManager = new TaskManager({
      autoClearOldTasks: true,
    });

    if (distributed) {
      this.handlerManager = new DistributedHandlerManager();
    } else {
      this.handlerManager = new CentralizedHandlerManager();
    }
  }

  public async init(pgClientConfig: ClientConfig) {
    // create the pg client
    this.client = new Client({
      ...pgClientConfig,
    });
    await this.client.connect();

    await this.taskManager.init(this.client);
    await this.handlerManager.init(this.client);

    if (this.distributed) {
      await this.client.query(createSchedulerTable);
      this.schedulerId = await this.registerScheduler();
      this.intervalId = this.infinitePingLoop();
    }

    this.initialized = true;
  }

  // TODO: In order to avoid the polling interval delay in task execution, query tasks that will be executing in the
  //  near future and queue up their execution using setTimeout. When the setTimeout fires, acquire a lock on the task
  //  and execute it. This ensures the task is only executed once even if there are many available task handlers. This
  //  feature should be optional
  /**
   * Starts the loop that fetches tasks and executes them every intervalMs. By default, the interval is 30 seconds.
   * This means, every 30 seconds PgTaskScheduler will fetch all tasks that are ready to be executed and execute them.
   * To ensure on-time execution, tasks should be scheduled at least intervalMs in the future.
   * @param intervalMs
   */
  @CheckInitialized
  public async start(intervalMs: number = 30000) {
    // start the loop function with setInterval
  }

  private async loop() {
    // fetch all tasks that are ready to be executed
    // TODO: benchmark the number of tasks that can be executed in parallel
    // for each task start a new transaction and lock the task - this should be done async (each txn in parallel)
    // // execute the task handler
    // // remove the task
    // // commit the transaction
  }

  // return the interval id
  private infinitePingLoop(): ReturnType<number> {
    return setInterval(async () => {
      await this.client.query("SELECT 1");
    }, this.pingInterval);
  }

  private async registerScheduler(): Promise<number> {
    const result = await this.client.query(``);
    return result.rows[0].id;
  }

  @CheckInitialized
  public async destroy() {
    await this.client.end();
    this.initialized = false;

    if (this.distributed && this.intervalId != 0) {
      clearInterval(this.intervalId);
      this.intervalId = 0;
    }
  }
}
