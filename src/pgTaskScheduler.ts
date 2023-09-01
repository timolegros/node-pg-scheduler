import {Client, ClientConfig} from 'pg';
import {createTasksTable} from "./queries";
import {CheckInitialized} from "./util";
import {TaskHandlerManager} from "./taskHandlerManager";
import {TaskManager} from "./taskManager";

export class PgTaskScheduler extends TaskManager, TaskHandlerManager {
  private autoClearOldTasks: boolean = true;

  private client: Client;
  protected initialized: boolean = false;
  private concurrentlyExecutingTasks: number = 0;

  constructor() {
    super();
    console.log('PgScheduler constructor');
  }

  public async init(pgClientConfig: ClientConfig) {
    // create the pg client
    this.client = new Client({
      ...pgClientConfig,
    });
    await this.client.connect();

    // create the tasks table if it doesn't exist
    try {
      await this.client.query(createTasksTable);
    } catch (e) {
      console.error('Error creating tasks table', e);
      return;
    }

    // clear old tasks if autoClearOldTasks is true
    if (this.autoClearOldTasks) {
      await this.clearOldTasks();
    }

    this.initialized = true;
  }

  // TODO: In order to avoid the polling interval delay in task execution, query tasks that will be executing in the
  //  near future and queue up their execution using setTimeout. When the setTimeout fires, acquire a lock on the task
  //  and execute it. This ensures the task is only executed once even if there are many available task handlers
  /**
   * Starts the loop that fetches tasks and executes them every intervalMs. By default, the interval is 30 seconds.
   * This means, every 30 seconds PgTaskScheduler will fetch all tasks that are ready to be executed and execute them.
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

  @CheckInitialized
  public async destroy() {
    await this.client.end();
    this.initialized = false;
  }
}
