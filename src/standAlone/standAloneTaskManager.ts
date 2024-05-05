import { AbstractTaskManager } from "../abstracts/abstractTaskManager";
import {TaskManagerOptions, TaskType} from "../types";
import {logger} from "../logger";
import {mustBeInitialized} from "../util";

const log = logger(__filename);

export class StandAloneTaskManager extends AbstractTaskManager {
  constructor(options: TaskManagerOptions) {
    super(options);
  }

  /**
   * Gets all tasks that are ready to be executed. This means tasks returned by this function are not locked in the
   * database by another transaction. WARNING: this function only selects tasks that haven't been locked but does not
   * lock the tasks it selects.
   */
  public async getExecutableTasks(): Promise<TaskType[]> {
    mustBeInitialized(this.initialized, this.constructor.name);

    log.trace("Getting executable tasks");
    const result = await this.pool.query<TaskType>(
      `
      SELECT * FROM tasks
      WHERE 
          namespace = $1 AND
          date <= CURRENT_TIMESTAMP AND date > (CURRENT_TIMESTAMP - ($2 * INTERVAL '1 millisecond'))
      FOR UPDATE SKIP LOCKED;
    `,
      [this._namespace, this.maxTaskAge]
    );
    console.debug("Executable tasks:", JSON.stringify(result.rows, null, 2));
    return result.rows;
  }
}
