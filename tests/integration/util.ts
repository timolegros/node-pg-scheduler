import { Pool } from "pg";
import {
  createHandlerTable,
  createSchedulerTable,
  createTasksTable,
} from "../../src/queries";

export const pgPoolConfig = {
  connectionString:
    "postgres://scheduler:scheduler_pswd@localhost:5432/node_pg_scheduler",
};

export async function createTables() {
  const pool = new Pool(pgPoolConfig);
  await pool.query(createTasksTable);
  await pool.query(createSchedulerTable);
  await pool.query(createHandlerTable);
}

export async function clearTables() {
  const pool = new Pool(pgPoolConfig);
  await pool.query("DROP TABLE IF EXISTS tasks");
  await pool.query("DROP TABLE IF EXISTS handlers");
  await pool.query("DROP TABLE IF EXISTS schedulers");

}

export async function insertIntoTasks({
  pool,
  date,
  name,
  data,
  namespace,
}: {
  pool: Pool;
  date: { interval: 'day' | 'week' | 'month', amount: number, pos: '-' | '+' };
  name: string;
  data: string;
  namespace: string;
}) {
  await pool.query(
    `INSERT INTO tasks (date, name, data, namespace)
                    VALUES ((CURRENT_TIMESTAMP ${date.pos} INTERVAL '${date.amount} ${date.interval}'), $1, $2, $3);`,
    [name, data, namespace],
  );
}
