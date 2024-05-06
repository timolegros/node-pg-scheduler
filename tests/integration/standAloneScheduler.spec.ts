import {StandAloneScheduler} from "../../src";
import {ExecutionMode} from "../../src/types";
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {clearTables, createTables, pgPoolConfig} from "./util";
import {Pool} from "pg";
import {notInitializedErrorMsg} from "../../src/util";
import sinon from 'sinon';
import {sleep} from "../util";

chai.use(chaiAsPromised);

const namespace = 'test';

const SLEEP_TIME = 100;

describe("StandAloneScheduler", () => {
  let clock: sinon.SinonFakeTimers;
  const pool = new Pool(pgPoolConfig);

  beforeEach(async () => {
    await createTables();
  });

  after(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await clearTables();
  })

  describe.skip("Single Execution", () => {
    it("should initialize the scheduler", async () => {
      const scheduler = new StandAloneScheduler({
        namespace,
        executionMode: ExecutionMode.single,
        pgPoolConfig,
      });
      expect(scheduler).to.not.be.undefined;

      await scheduler.init();
      expect(scheduler.isInitialized()).to.be.true;
    });

    it('should fail to start if the scheduler is not initialized', async () => {
      const scheduler = new StandAloneScheduler({
        namespace,
        executionMode: ExecutionMode.single,
        pgPoolConfig,
      });
      await expect(scheduler.start()).to.be.rejectedWith(notInitializedErrorMsg(StandAloneScheduler.name));
    });

    it("should not execute tasks that don't have a handler", async () => {

    });

    it("should not execute tasks that aren't due yet", async () => {
    });

    it("should not throw an error if a task execution fails", async () => {
    });
    it("should not delete a task if the handler failed to execute", async () => {
    });

    it("should execute all executable tasks", async () => {
    });
    it("should delete executed tasks", async () => {
    });
  });

  describe("Realtime Execution (start)", () => {
    const baseOptions = {
      namespace,
      executionMode: ExecutionMode.realtime,
      pgPoolConfig,
    };

    it('should initialize, start, and stop an empty scheduler', async () => {
      const scheduler = new StandAloneScheduler({
        ...baseOptions,
        namespace: 'empty-scheduler-dry-run'
      });
      expect(scheduler).to.not.be.undefined;

      await scheduler.init();
      expect(scheduler.isInitialized()).to.be.true;

      await scheduler.start();
      expect(scheduler.isStarted()).to.be.true;

      scheduler.stop();
      expect(scheduler.isStarted()).to.be.false;
    });

    it('should fail to start if the scheduler is not initialized', async () => {
      const scheduler = new StandAloneScheduler({
        ...baseOptions,
        namespace: 'fail-to-start',
      });
      await expect(scheduler.start()).to.be.rejectedWith(notInitializedErrorMsg(StandAloneScheduler.name));
    });

    it('should execute a single task on-time', async () => {
      clock = sinon.useFakeTimers(new Date());
      const scheduler = new StandAloneScheduler({
        ...baseOptions,
        handleInterval: 60_000,
        namespace: 'execute-one-task',
      });
      await scheduler.init();

      const name = 'test';
      const handler = sinon.stub().callsFake(() => Promise.resolve());
      await scheduler.registerTaskHandler(name, handler);

      const taskExecutionDelay = 30_000
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay), name, '{}');

      expect(handler.notCalled, 'Handler should not execute immediately').to.be.true;

      await scheduler.start();
      expect(scheduler.isStarted()).to.be.true;

      expect(handler.notCalled, 'Handler should not execute immediately').to.be.true;

      // advance half the amount of time until the handler should run
      await clock.tickAsync(taskExecutionDelay / 2);
      expect(handler.notCalled, 'Handler should not execute after half the delay').to.be.true;

      const res = scheduler.stop();
      expect(res).to.be.true;
      expect(scheduler.isInitialized()).to.be.true;
      expect(scheduler.isStarted()).to.be.false;

      await clock.runAllAsync();
      clock.restore();
      await sleep(SLEEP_TIME);
      expect(handler.calledOnce, 'Handler should execute after the correct delay').to.be.true;
    }).timeout(5_000);

    it('should execute a single task immediately if delayed', async () => {
      clock = sinon.useFakeTimers(new Date());
      const scheduler = new StandAloneScheduler({
        ...baseOptions,
        handleInterval: 60_000,
        namespace: 'execute-one-task-immediately',
      });
      await scheduler.init();

      const name = 'test';
      const handler = sinon.stub().callsFake(() => Promise.resolve());
      await scheduler.registerTaskHandler(name, handler);

      await scheduler.scheduleTask(new Date(new Date().getTime() + 500), name, '{}');
      await clock.tickAsync(5_000);

      await scheduler.start();
      expect(scheduler.isInitialized()).to.be.true;
      expect(scheduler.isStarted()).to.be.true;

      // restore clock before starting to ensure normal start functionality
      clock.restore();

      const res = scheduler.stop();
      expect(res).to.be.true;

      await sleep(SLEEP_TIME);
      expect(handler.calledOnce, 'Handler should execute overdue tasks immediately').to.be.true;
    }).timeout(5_000);

    it('should schedule many tasks for parallel execution', async () => {
      clock = sinon.useFakeTimers(new Date());
      const scheduler = new StandAloneScheduler({
        ...baseOptions,
        handleInterval: 60_000,
        namespace: 'execute-many-tasks',
      });
      await scheduler.init();

      const name = 'test';
      const handler = sinon.stub().callsFake(() => Promise.resolve());
      await scheduler.registerTaskHandler(name, handler);

      const taskExecutionDelay = 30_000
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay), name, '{}');
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay + 1_000), name, '{}');
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay + 2_000), name, '{}');

      expect(handler.notCalled, 'Handler should not execute immediately').to.be.true;

      await scheduler.start();
      expect(scheduler.isStarted()).to.be.true;

      expect(handler.notCalled, 'Handler should not execute immediately').to.be.true;

      const res = scheduler.stop();
      expect(res).to.be.true;
      expect(scheduler.isInitialized()).to.be.true;
      expect(scheduler.isStarted()).to.be.false;

      // advance half the amount of time until the handler should run
      await clock.tickAsync(taskExecutionDelay / 2);
      expect(handler.notCalled, 'Handler should not execute after half the delay').to.be.true;
      await clock.runAllAsync();
      clock.restore();

      await sleep(SLEEP_TIME);
      expect(handler.calledThrice, 'Handler should execute after the correct delay').to.be.true;
    });

    it('should execute many overdue tasks immediately in parallel', async () => {
      clock = sinon.useFakeTimers(new Date());
      const scheduler = new StandAloneScheduler({
        ...baseOptions,
        handleInterval: 60_000,
        namespace: 'execute-many-tasks-immediately',
      });
      await scheduler.init();

      const name = 'test';
      const handler = sinon.stub().callsFake(() => Promise.resolve());
      await scheduler.registerTaskHandler(name, handler);

      const taskExecutionDelay = 30_000
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay), name, '{}');
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay + 1_000), name, '{}');
      await scheduler.scheduleTask(new Date(new Date().getTime() + taskExecutionDelay + 2_000), name, '{}');

      expect(handler.notCalled, 'Handler should not execute immediately').to.be.true;

      await clock.tickAsync(33_000);

      await scheduler.start();
      expect(scheduler.isStarted(), 'Scheduler should be started').to.be.true;

      clock.restore();

      const res = scheduler.stop();
      expect(res, 'Scheduler polling interval should be stopped').to.be.true;

      await sleep(SLEEP_TIME);
      expect(handler.calledThrice, 'Handler should execute after the correct delay').to.be.true;
    }).timeout(10_000);

    it('should set timeouts for newly scheduled tasks after starting', async () => {

    })
  });

  describe('Distributed scheduler', () => {});
});
