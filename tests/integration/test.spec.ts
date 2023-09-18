import { ExecutionMode } from "../../src/types";
import { StandAloneScheduler } from "../../src";

async function main() {
  const scheduler = new StandAloneScheduler({
    executionMode: ExecutionMode.single,
    logLevel: "trace",
    pgPoolConfig: {
      connectionString:
        "postgres://scheduler:scheduler_pswd@localhost:5432/node_pg_scheduler",
    },
  });

  await scheduler.init();
  const now = new Date();
  now.setUTCDate(now.getDate() + 1);
  await scheduler.registerTaskHandler("test", async (task) => {
    console.log("Executed");
  });
  await scheduler.scheduleTask(now, "test", "{}");
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
