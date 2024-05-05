import { Pool } from "pg";
import { clearTables, createTables, pgPoolConfig } from "./util";
import { StandAloneHandlerManager } from "../../src/standAlone/standAloneHandlerManager";
import { notInitializedErrorMsg } from "../../src/util";
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe("StandAloneHandlerManager", () => {
  const pool = new Pool(pgPoolConfig);

  before(async () => {
    await createTables();
  });

  after(async () => {
    await clearTables();
    await pool.end();
  });

  describe("registerTaskHandler", () => {
    it("should fail to register a task handler if the manager is not initialized", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await expect(
        standAloneHandlerManager.registerTaskHandler("test", () =>
          Promise.resolve(),
        ),
      ).to.be.rejectedWith(
        notInitializedErrorMsg(standAloneHandlerManager.constructor.name),
      );
    });

    it("should register a task handler", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await standAloneHandlerManager.init();
      const result = await standAloneHandlerManager.registerTaskHandler("test", () =>
        Promise.resolve(),
      );
      expect(result).to.be.true;
    });

    it("should not throw if a handler with the same name is already registered", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await standAloneHandlerManager.init();
      await standAloneHandlerManager.registerTaskHandler("test", () =>
        Promise.resolve(),
      );
      const result = await standAloneHandlerManager.registerTaskHandler("test", () =>
        Promise.resolve(),
      );
      expect(result).to.be.false;
    });
  });

  describe("removeTaskHandler", () => {
    it("should fail to remove a task handler if the manager is not initialized", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await expect(
        standAloneHandlerManager.removeTaskHandler("test"),
      ).to.be.rejectedWith(
        notInitializedErrorMsg(standAloneHandlerManager.constructor.name),
      );
    });

    it("should remove a task handler", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await standAloneHandlerManager.init();
      await standAloneHandlerManager.registerTaskHandler("test", () =>
        Promise.resolve(),
      );
      const result = await standAloneHandlerManager.removeTaskHandler("test");
      expect(result).to.be.true;
    });

    it("should not throw if a handler with the given name doesn't exist", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await standAloneHandlerManager.init();
      const result = await standAloneHandlerManager.removeTaskHandler("test");
      expect(result).to.be.false;
    });
  });

  describe("getTaskHandlers", () => {
    it("should fail to get task handlers if the manager is not initialized", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      try {
        standAloneHandlerManager.getTaskHandlers();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.equal(notInitializedErrorMsg(standAloneHandlerManager.constructor.name))
      }
    });

    it("should not throw if no task handlers are registered", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      await standAloneHandlerManager.init();
      const result = standAloneHandlerManager.getTaskHandlers();
      expect(result).to.be.empty;
    });

    it("should return task handlers", async () => {
      const standAloneHandlerManager = new StandAloneHandlerManager({
        namespace: "test",
      });
      const taskHandler = () => Promise.resolve();
      await standAloneHandlerManager.init();
      await standAloneHandlerManager.registerTaskHandler("test", taskHandler
      );
      const result = standAloneHandlerManager.getTaskHandlers();
      expect(result).to.deep.equal({ test: taskHandler });
    });
  });
});
