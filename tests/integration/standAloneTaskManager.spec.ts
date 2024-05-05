import { StandAloneTaskManager } from "../../src/standAlone/standAloneTaskManager";
import { Pool } from "pg";
import { Errors } from "../../src/abstracts/abstractTaskManager";
import { StandAloneHandlerManager } from "../../src/standAlone/standAloneHandlerManager";
import {notInitializedErrorMsg} from "../../src/util";
import {clearTables, createTables, insertIntoTasks, pgPoolConfig} from "./util";
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe("StandAloneTaskManager", () => {
  const pool = new Pool(pgPoolConfig);

  before(async () => {
    await createTables();
  });

  after(async () => {
    await clearTables();
    await pool.end();
  })

  describe("initialization", () => {
    it("should do nothing if already initialized", async () => {
      const taskManager = new StandAloneTaskManager({
        pool,
        clearOutdatedTasks: false,
        maxTaskAge: 1,
        namespace: 'test',
      });
      await taskManager.init();
      await taskManager.init();
    });
    it("should create the tasks table if it does not exist", async () => {});
    it("should set initialized to true if successfully initialized", async () => {});

    describe("old task cleanup", () => {
      let handlerManager: StandAloneHandlerManager;

      beforeEach(async () => {
        await pool.query("DELETE FROM tasks");
        handlerManager = new StandAloneHandlerManager({ namespace: 'test' });
        await handlerManager.init();
      });

      it("should not remove tasks if clearOutdatedTasks is false", async () => {
        const taskManager = new StandAloneTaskManager({
          pool,
          clearOutdatedTasks: false,
          maxTaskAge: 1,
          namespace: 'test'
        });

        await pool.query(`
            INSERT INTO tasks (date, name, data, namespace)
            VALUES ((CURRENT_TIMESTAMP - INTERVAL '1 month'), 'test', '{}', 'test');
        `);

        await taskManager.init();

        const result = await pool.query("SELECT * FROM tasks");
        expect(result.rows.length).to.equal(1);
      });

      it("should not remove tasks younger than maxTaskAge", async () => {
        const taskManager = new StandAloneTaskManager({
          pool,
          clearOutdatedTasks: true,
          maxTaskAge: 1,
          namespace: 'test'
        });

        await pool.query(`
            INSERT INTO tasks (date, name, data, namespace)
            VALUES ((CURRENT_TIMESTAMP + INTERVAL '1 day'), 'test', '{}', 'test');
        `);

        await taskManager.init();

        const result = await pool.query("SELECT * FROM tasks");
        expect(result.rows.length).to.equal(1);
      });

      it("should remove tasks older than maxTaskAge", async () => {
        const taskManager = new StandAloneTaskManager({
          pool,
          clearOutdatedTasks: true,
          maxTaskAge: 1,
          namespace: 'test'
        });

        await insertIntoTasks({
          pool,
          date: { interval: "day", amount: 1, pos: "-" },
          name: "test",
          data: "{}",
          namespace: "test",
        });
        await insertIntoTasks({
          pool,
          date: { interval: "day", amount: 1, pos: "-" },
          name: "test2",
          data: "{}",
          namespace: "test",
        });
        await insertIntoTasks({
          pool,
          date: { interval: "day", amount: 1, pos: "+" },
          name: "test2",
          data: "{}",
          namespace: "test",
        });

        await taskManager.init();

        const result = await pool.query("SELECT * FROM tasks");
        expect(result.rows.length).to.equal(1);
      });
    });
  });

  describe("scheduling", () => {
    const handlerManager = new StandAloneHandlerManager({ namespace: 'test' });
    let taskManager: StandAloneTaskManager;

    before(async () => {
      await handlerManager.init();
    });

    beforeEach(async () => {
      taskManager = new StandAloneTaskManager({
        pool,
        clearOutdatedTasks: false,
        maxTaskAge: 999999999,
        namespace: 'test'
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
        namespace: 'test'
      });
      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        noInitTaskManager.scheduleTask({
          date: now,
          name: "test",
          data: "{}",
          namespace: "test",
          handlerManager,
        }),
      ).to.be.rejectedWith(notInitializedErrorMsg(noInitTaskManager.constructor.name));
    });

    it("should fail to schedule a task with a date in the past", async () => {
      const now = new Date();
      now.setUTCDate(now.getDate() - 1);
      await expect(
        taskManager.scheduleTask({
          date: now,
          name: "test",
          data: "{}",
          namespace: "test",
          handlerManager,
        }),
      ).to.be.rejectedWith(Errors.INVALID_DATE);
    });

    it("should throw if the given handler manager is not initialized", async () => {
      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      const newHandler = new StandAloneHandlerManager({ namespace: 'test' });
      await expect(
        taskManager.scheduleTask({
          date: now,
          name: "test",
          data: "{}",
          namespace: "test",
          handlerManager: newHandler
        }),
      ).to.be.rejectedWith(notInitializedErrorMsg(newHandler.constructor.name));
    });

    it("should fail to schedule a task with no handler registered", async () => {
      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask({
          date: now,
          name: "test",
          data: "{}",
          namespace: "test",
          handlerManager,
        }),
      ).to.be.rejectedWith(Errors.NO_REGISTERED_HANDLER("test"));
    });

    it("should fail to schedule a task with a name longer than 255 characters", async () => {
      const registration = await handlerManager.registerTaskHandler(
        "test",
        async () => {
          return;
        },
      );
      expect(registration).to.be.true;

      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask({
          date: now,
          name: "a".repeat(256),
          data: "{}",
          namespace: "test",
          handlerManager,
        }),
      ).to.be.rejected;
    });

    it("should fail to schedule a task without a namespace", async () => {
      const registration = await handlerManager.registerTaskHandler(
        "test",
        async () => {
          return;
        },
      );
      expect(registration).to.be.true;

      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      await expect(
        taskManager.scheduleTask({
          date: now,
          name: "test",
          data: "{}",
          handlerManager,
        } as any),
      ).to.be.rejected;
    });

    it("should schedule a task with a valid date and handler", async () => {
      const registration = await handlerManager.registerTaskHandler(
        "test",
        async () => {
          return;
        },
      );
      expect(registration).to.be.true;

      const now = new Date();
      now.setUTCDate(now.getDate() + 1);
      const taskId = await taskManager.scheduleTask({
        date: now,
        name: "test",
        data: "{}",
        namespace: "test",
        handlerManager,
      });
      expect(taskId).to.exist;

      const result = await pool.query("SELECT * FROM tasks");
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0]).to.deep.equal({
        id: taskId,
        date: now,
        name: "test",
        data: "{}",
        namespace: "test"
      });
    });
  });

  describe("getTasks", () => {
    it("should fail if the task manager is not initialized", async () => {});
    it("should return all tasks if no options are given", async () => {});
    it("should return a task with the given id", async () => {});
    it("should return tasks with the given name", async () => {});
    it("should return tasks with the given category", async () => {});
    it("should return tasks that don't have the given id", async () => {});
  });

  describe("removeTask", () => {
    it("should fail if the task manager is not initialized", async () => {});
    it("should remove a task with the given id", async () => {});
    it("should remove tasks with the given name", async () => {});
    it("should remove tasks with the given category", async () => {});
    it("should remove tasks that don't have the given id", async () => {});
  });

  describe("getExecutableTasks", () => {
    it("should fail if the task manager is not initialized", async () => {});
    it("should return no tasks if no tasks are ready to be executed", async () => {});
    it("should return tasks that are ready to be executed", async () => {});
    it("should not return tasks that are locked", async () => {});
  });
});
