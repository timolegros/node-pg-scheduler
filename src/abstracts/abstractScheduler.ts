import { Pool, PoolConfig } from "pg";
import { StandAloneTaskManager } from "../standAlone/standAloneTaskManager";
import { StandAloneHandlerManager } from "../standAlone/standAloneHandlerManager";
import {
  ExecutionMode,
  ExecutionModeType,
  TaskHandlerType,
  TaskType,
} from "../types";
import { logger } from "../logger";
import { mustBeInitialized } from "../util";
import { Base } from "../standAlone/base";

const log = logger(__filename);

export abstract class AbstractScheduler extends Base {
  protected readonly executionMode: ExecutionModeType;
  protected readonly pool: Pool;
  protected abstract taskManager: StandAloneTaskManager;
  protected abstract handlerManager: StandAloneHandlerManager;

  // realtime execution properties
  // Integer ids of tasks that are set to run with setTimeout
  protected timeoutTaskIds = new Set<number>();
  protected intervalId: ReturnType<typeof setTimeout> | undefined;
  protected readonly handleInterval: number;

  protected started: boolean = false;

  // note that the number of concurrent connections setup in the pool limits the number of
  // concurrent tasks that can be executed since each task is executed in its own transaction
  protected constructor(
    pgPoolConfig: PoolConfig,
    handleInterval: number | undefined,
    executionMode: "single" | "realtime",
    namespace: string,
  ) {
    super({ namespace });
    this.pool = new Pool(pgPoolConfig);
    this.handleInterval = handleInterval ?? 30000;
    this.executionMode = executionMode;
  }

  public async start(): Promise<boolean> {
    if (this.started) {
      return false;
    }
    mustBeInitialized(this.initialized, this.constructor.name);
    if (this.executionMode === ExecutionMode.single) {
      await this.singleExecution();
    } else {
      await this.startRealtimeExecution();
    }
    this.started = true;
    return true;
  }

  public stop(): boolean {
    if (this.executionMode === ExecutionMode.single || !this.started) {
      return false;
    }

    clearInterval(this.intervalId);
    this.started = false;
    return true;
  }

  protected async executeTask(
    task: TaskType,
    handler: TaskHandlerType,
  ): Promise<boolean> {
    mustBeInitialized(this.initialized, this.constructor.name);
    const client = await this.pool.connect();
    log.debug(`executeTask(): Executing task ${task.id}`);
    await client.query("BEGIN;");
    const result = await client.query(
      `
          SELECT *
          FROM tasks
          WHERE id = $1
              FOR UPDATE SKIP LOCKED;
      `,
      [task.id],
    );

    if (result.rows.length !== 1) {
      log.info(`Task ${task.id} is already locked`);
      await client.query("ROLLBACK;");
      client.release();
      return false;
    }

    try {
      await handler(task.data);
    } catch (e) {
      log.error(`Error executing task ${task.id}`, e);
      // TODO: add max error count so we can re-execute tasks a maximum number of times?
      await client.query("ROLLBACK;");
      client.release();
      return false;
    }

    await client.query("DELETE FROM tasks WHERE id = $1", [task.id]);
    await client.query("COMMIT;");
    client.release();
    log.debug(`executeTask(): Finished executing task ${task.id}`);
    return true;
  }

  protected async singleExecution(): Promise<TaskType[]> {
    const executableTasks = await this.taskManager.getExecutableTasks();
    const handlers = this.handlerManager.getTaskHandlers();
    const promises = [];
    for (const task of executableTasks) {
      if (!handlers[task.name]) {
        log.warn(`No handler registered for task ${task.id}`);
        continue;
      }
      promises.push(this.executeTask(task, handlers[task.name]));
    }

    await Promise.all(promises);

    return executableTasks;
  }

  protected async startRealtimeExecution(): Promise<void> {
    mustBeInitialized(this.initialized, this.constructor.name);

    log.debug(
      { namespace: this.namespace },
      "startRealtimeExecution(): Starting realtime execution",
    );
    await this.realtimeExecution();
    log.debug(
      { namespace: this.namespace },
      "First realtime execution executed",
    );
    this.intervalId = setInterval(async () => {
      log.debug({ namespace: this.namespace }, "Starting interval execution");
      await this.realtimeExecution();
    }, this.handleInterval);
    log.trace("startRealtimeExecution(): Finished realtime execution");
  }

  // TODO: add optional handler definition here so you don't have to call registerTaskHandler first
  public async scheduleTask(
    date: Date,
    name: string,
    data: string,
  ): Promise<void> {
    await this.taskManager.scheduleTask({
      date,
      name,
      data,
      namespace: this.namespace,
      handlerManager: this.handlerManager,
    });
  }

  public async registerTaskHandler(
    name: string,
    handler: TaskHandlerType,
  ): Promise<boolean> {
    return await this.handlerManager.registerTaskHandler(name, handler);
  }

  protected abstract realtimeExecution(): Promise<void>;

  public async destroy(): Promise<void> {
    mustBeInitialized(this.initialized, this.constructor.name);

    this.initialized = false;
    await this.pool.end();

    if (this.executionMode === "realtime" && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isStarted(): boolean {
    return this.started;
  }
}
