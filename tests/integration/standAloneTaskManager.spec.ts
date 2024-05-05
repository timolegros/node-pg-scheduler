import { StandAloneTaskManager } from "../../src/standAlone/standAloneTaskManager";
import { Pool } from "pg";
import { expect } from "chai";
import { Errors } from "../../src/abstractTaskManager";
import { StandAloneHandlerManager } from "../../src/standAlone/standAloneHandlerManager";
import {notInitializedError} from "../../src/util";
import {createTasksTable} from "../../src/queries";

describe("StandAloneTaskManager", () => {
  // TODO: connection string
  const pool = new Pool();
  before(async () => {
    await pool.query(createTasksTable);
  });

  describe("initialization", () => {
    it('should do nothing if already initialized', async () => {});
    it('should create the tasks table if it does not exist', async () => {});
    it('should set initialized to true if successfully initialized', async () => {});
    describe("old task cleanup", () => {
      let handlerManager: StandAloneHandlerManager;

      beforeEach(async () => {
        await pool.query("DELETE FROM tasks");
      });

      beforeEach(async () => {
        handlerManager = new StandAloneHandlerManager();
        await handlerManager.init();
      });

      it("should not remove tasks if clearOutdatedTasks is false", async () => {
        const taskManager = new StandAloneTaskManager({
          pool,
          clearOutdatedTasks: false,
          maxTaskAge: 1,
        });

        await pool.query(`
        INSERT INTO tasks (date, name, data)
        VALUES ((CURRENT_TIMESTAMP - (1 * INTERVAL 'month')), 'test', '{}');
      `);

        await taskManager.init();

        const result = await pool.query("SELECT * FROM tasks");
        expect(result.rows.length).to.equal(1);
      });

      it('should not remove tasks younger than maxTaskAge', async () => {
        const taskManager = new StandAloneTaskManager({
          pool,
          clearOutdatedTasks: true,
          maxTaskAge: 1,
        });

        await pool.query(`
        INSERT INTO tasks (date, name, data)
        VALUES ((CURRENT_TIMESTAMP + (1 * INTERVAL 'day')), 'test', '{}');
      `);

        await taskManager.init();

        const result = await pool.query("SELECT * FROM tasks");
        expect(result.rows.length).to.equal(1);
      });

      it('should remove tasks older than maxTaskAge', async () => {
        const taskManager = new StandAloneTaskManager({
          pool,
          clearOutdatedTasks: true,
          maxTaskAge: 1,
        });

        await pool.query(`
        INSERT INTO tasks (date, name, data)
        VALUES ((CURRENT_TIMESTAMP - (1 * INTERVAL 'day')), 'test', '{}');
      `);
        await pool.query(`
        INSERT INTO tasks (date, name, data)
        VALUES ((CURRENT_TIMESTAMP - (1 * INTERVAL 'day')), 'test2', '{}');
      `);
        await pool.query(`
        INSERT INTO tasks (date, name, data)
        VALUES ((CURRENT_TIMESTAMP + (1 * INTERVAL 'day')), 'test2', '{}');
      `);

        await taskManager.init();

        const result = await pool.query("SELECT * FROM tasks");
        expect(result.rows.length).to.equal(1);
      });
    });
  });

  describe("scheduling", () => {
    const handlerManager = new StandAloneHandlerManager();
    let taskManager: StandAloneTaskManager;

    before(async () => {
      await handlerManager.init();
    });

    beforeEach(async () => {
      taskManager = new StandAloneTaskManager({
        pool,
        clearOutdatedTasks: false,
        maxTaskAge: 999999999,
      });
      await taskManager.init();
    });

    afterEach(async () => {
      await pool.query("DELETE FROM tasks");
      await handlerManager.removeTaskHandler("test");
    });

    it("should fail to schedule a task if the task manager is not initialized", async () => {
      const noInitTaskManager = new StandAloneTaskManager({
        pool,
        clearOutdatedTasks: false,
        maxTaskAge: 999999999,
      });
      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        noInitTaskManager.scheduleTask(now, "test", "{}", null, handlerManager)
      ).to.be.rejectedWith(notInitializedError('scheduleTask'));
    });

    it("should fail to schedule a task with a date in the past", async () => {
      const now = new Date();
      now.setUTCDate(now.getDate() - 1);
      await expect(
        taskManager.scheduleTask(now, "test", "{}", null, handlerManager)
      ).to.be.rejectedWith(Errors.INVALID_DATE);
    });

    it("should throw if the given handler manager is not initialized", async () => {
      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask(
          now,
          "test",
          "{}",
          null,
          new StandAloneHandlerManager()
        )
      ).to.be.rejectedWith(
        notInitializedError('getTaskHandlers')
      );
    });

    it("should fail to schedule a task with no handler registered", async () => {
      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask(now, "test", "{}", null, handlerManager)
      ).to.be.rejectedWith(Errors.NO_REGISTERED_HANDLER("test"));
    });

    it("should fail to schedule a task with a name longer than 255 characters", async () => {
      const registration = await handlerManager.registerTaskHandler(
        "test",
        async () => {
          return;
        }
      );
      expect(registration).to.be.true;

      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask(
          now,
          "a".repeat(256),
          "{}",
          null,
          handlerManager
        )
      ).to.be.rejected;
    });

    it("should fail to schedule a task with a category longer than 255 characters", async () => {
      const registration = await handlerManager.registerTaskHandler(
        "test",
        async () => {
          return;
        }
      );
      expect(registration).to.be.true;

      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask(
          now,
          "test",
          "{}",
          "a".repeat(256),
          handlerManager
        )
      ).to.be.rejected;
    });

    it("should schedule a task with a valid date and handler", async () => {
      const registration = await handlerManager.registerTaskHandler(
        "test",
        async () => {
          return;
        }
      );
      expect(registration).to.be.true;

      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      const taskId = await taskManager.scheduleTask(
        now,
        "test",
        "{}",
        null,
        handlerManager
      );
      expect(taskId).to.equal(1);

      const result = await pool.query("SELECT * FROM tasks");
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0]).to.deep.equal({
        id: 1,
        date: now,
        name: "test",
        data: "{}",
        category: null,
      });
    });
  });

  describe("getTasks", () => {
    it('should fail if the task manager is not initialized', async () => {});
    it('should return all tasks if no options are given', async () => {});
    it('should return a task with the given id', async () => {});
    it('should return tasks with the given name', async () => {});
    it('should return tasks with the given category', async () => {});
    it('should return tasks that don\'t have the given id', async () => {});
  });

  describe("removeTask", () => {
    it('should fail if the task manager is not initialized', async () => {});
    it('should remove a task with the given id', async () => {});
    it('should remove tasks with the given name', async () => {});
    it('should remove tasks with the given category', async () => {});
    it('should remove tasks that don\'t have the given id', async () => {});
  });

  describe("getExecutableTasks", () => {
    it('should fail if the task manager is not initialized', async () => {});
    it('should return no tasks if no tasks are ready to be executed', async () => {});
    it('should return tasks that are ready to be executed', async () => {});
    it('should not return tasks that are locked', async () => {});
  });
});
