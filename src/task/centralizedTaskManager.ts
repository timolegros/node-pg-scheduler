import { CheckInitialized } from "../util";
import { TaskManagerOptions, TaskType } from "./types";
import { AbstractTaskManager } from "./abstractTaskManager";
import log from "loglevel";

export class CentralizedTaskManager extends AbstractTaskManager {
  constructor(options: TaskManagerOptions) {
    super(options);
  }

  /**
   * Gets all tasks that are ready to be executed. This means tasks returned by this function are not locked in the
   * database by another transaction.WARNING: this function only selects tasks that haven't been locked but does not
   * lock the tasks it selects.
   */
  @CheckInitialized
  public async getExecutableTasks(): Promise<TaskType[]> {
    log.trace("Getting executable tasks");
    const result = await this.client.query(
      `
      SELECT * FROM tasks
      WHERE date <= CURRENT_TIMESTAMP AND date > (CURRENT_TIMESTAMP - ($1 * interval '1 millisecond'))
      FOR UPDATE SKIP LOCKED;
    `,
      [this.maxTaskAge]
    );
    console.debug("Executable tasks:", JSON.stringify(result.rows, null, 2));
    return result.rows;
  }

  public async getAllUnlockedTasks(): Promise<TaskType[]> {
    const result = await this.client.query(`
      SELECT * FROM tasks
      FOR UPDATE SKIP LOCKED;
    `);
    return result.rows;
  }
}
