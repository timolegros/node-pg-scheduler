import {Pool} from "pg";
import {clearTables, createTables, pgPoolConfig} from "./util";

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

    });
    it("should register a task handler", async () => {});
    it("should not throw if a handler with the same name is already registered", async () => {});
  });

  describe("removeTaskHandler", () => {
    it("should fail to remove a task handler if the manager is not initialized", async () => {});
    it("should remove a task handler", async () => {});
    it("should not throw if a handler with the given name doesn't exist", async () => {});
  });

  describe("getTaskHandlers", () => {
    it("should fail to get task handlers if the manager is not initialized", async () => {});
    it("should not throw if no task handlers are registered", async () => {});
    it("should return task handlers", async () => {});
  });
});
