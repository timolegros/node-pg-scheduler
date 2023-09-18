import { StandAloneScheduler } from "../../src";
import { ExecutionMode } from "../../src/types";
import { expect } from "chai";
import { Errors as TaskManagerErrors } from "../../src/task/abstractTaskManager";

const pgPoolConfig = {
  connectionString:
    "postgres://scheduler:scheduler_pswd@localhost:5432/node_pg_scheduler",
};

describe("StandAloneScheduler", () => {
  describe("Single Execution", () => {
    it("should initialize the scheduler", async () => {
      const scheduler = new StandAloneScheduler({
        executionMode: ExecutionMode.single,
        pgPoolConfig,
      });
      expect(scheduler).to.not.be.undefined;

      await scheduler.init();
      expect(scheduler.isInitialized()).to.be.true;
    });
  });
  describe("Realtime Execution", () => {});
});
