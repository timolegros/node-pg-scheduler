export const createTasksTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL,
    data TEXT NOT NULL,
    category VARCHAR(255),
    UNIQUE(date, name)
  );
`
