import { StandAloneScheduler } from "../../src";
import { ExecutionMode } from "../../src/types";
import { expect } from "chai";
import { Errors as TaskManagerErrors } from "../../src/abstractTaskManager";
import {clearTables, createTables, pgPoolConfig} from "./util";
import {Pool} from "pg";

describe("StandAloneScheduler", () => {
  const pool = new Pool(pgPoolConfig);

  before(async () => {
    await createTables();
  });

  after(async () => {
    await clearTables();
    await pool.end();
  });

  describe("Single Execution", () => {
    it("should initialize the scheduler", async () => {
      const scheduler = new StandAloneScheduler({
        namespace: 'test',
        executionMode: ExecutionMode.single,
        pgPoolConfig,
      });
      expect(scheduler).to.not.be.undefined;

      await scheduler.init();
      expect(scheduler.isInitialized()).to.be.true;
    });

    it("should not execute tasks that don\t have a handler", async () => {});
    it("should not execute tasks that aren't due yet", async () => {});

    it("should not throw an error if a task execution fails", async () => {});
    it("should not delete a task if the handler failed to execute", async () => {});

    it("should execute all executable tasks", async () => {});
    it("should delete executed tasks", async () => {});
  });
  describe("Realtime Execution", () => {});
});
