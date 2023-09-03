// TODO: add configurable/dynamic table name prefix

export const createTasksTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL,
    data TEXT NOT NULL,
    category VARCHAR(255),
    UNIQUE(date, name)
  );
`;

export const createSchedulerTable = `
  CREATE TABLE IF NOT EXISTS schedulers (
    id SERIAL PRIMARY KEY,
    registered_at TIMESTAMP NOT NULL,
    last_ping_at TIMESTAMP NOT NULL,
`;

export const createHandlerTable = `
  CREATE TABLE IF NOT EXISTS handlers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
    scheduler_id INTEGER NOT NULL REFERENCES schedulers(id),
    UNIQUE(name, scheduler_id)
  );
`;
