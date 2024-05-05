import { AbstractScheduler } from "../abstractScheduler";
import { logger } from "../logger";
import { createSchedulerTable } from "../queries";

const log = logger(__filename);

import {DistributedSchedulerOptions} from "../types";

export class DistributedScheduler extends AbstractScheduler {
  protected taskManager: any;
  protected handlerManager: any

  private readonly pingInterval: number;
  private pingIntervalId: NodeJS.Timeout | undefined;
  private schedulerId: number | undefined;

  constructor(options: DistributedSchedulerOptions) {
    super(
      options.pgPoolConfig,
      options.logLevel || "error",
      options.handleInterval,
      options.executionMode
    );

    this.pingInterval = options.pingInterval || 10000;
    this.handlerManager = 1;
    this.taskManager = {};
  }

  public async init() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.handlerManager.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.taskManager.init();
    this.initialized = true;

    log.trace("Initializing distributed scheduler");
    await this.pool.query(createSchedulerTable);
    this.schedulerId = await this.registerScheduler();
    this.pingIntervalId = this.infinitePingLoop();
  }

  protected async realtimeExecution(): Promise<void> {}

  public async destroy(): Promise<void> {
    log.trace("destroy(): Destroying scheduler");
    await super.destroy();

    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = undefined;
    }

    // TODO: delete scheduler from database
    log.trace("destroy(): Destroyed scheduler");
  }

  private infinitePingLoop(): NodeJS.Timeout {
    return setInterval(async () => {
      await this.pool.query("SELECT 1");
    }, this.pingInterval);
  }

  private async registerScheduler(): Promise<number> {
    const result = await this.pool.query(``);
    return result.rows[0].id;
  }
}
