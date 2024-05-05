[![Coverage Status](https://coveralls.io/repos/github/timolegros/node-pg-scheduler/badge.svg?branch=main)](https://coveralls.io/github/timolegros/node-pg-scheduler?branch=main)
![GitHub repo size](https://img.shields.io/github/repo-size/timolegros/node-pg-scheduler)
![GitHub License](https://img.shields.io/github/license/timolegros/node-pg-scheduler)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/timolegros/node-pg-scheduler/CI.yml?branch=main&label=CI)

# Node-PG-Scheduler

## Installation

```shell
yarn add node-pg-scheduler
```

or

```typescript
npm
install
node - pg - scheduler
```

## Terminology

- **namespace**: A namespace defines the boundaries for a scheduler. Namespace allows us to run many different
  schedulers using the same Postgres tables. It ensures that schedulers don't interfere with one another.

## Usage

To use Node-PG-Scheduler you must decide whether you want stand-alone usage or as part of a distributed system.

### StandAlone Usage

Use the `StandAloneScheduler` class if you intend to have only 1 task handler per namespace.

#### Configuration

| option               | description                                                                                                                                                                                                               | default |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `executionMode`      | One of 'single' or 'realtime'                                                                                                                                                                                             | NA      |
| `pgPoolConfig`       | PG configuration options. See the [PG](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/pg/index.d.ts#L43) or more info                                                                               | NA      |
| `namespace`          | The namespace for the scheduler. See [terminology](#Terminology) for more info                                                                                                                                            | NA      |
| `clearOutdatedTasks` | Clears expired tasks according to `maxTaskAge`                                                                                                                                                                            | `false` |
| `handleInterval`     | The interval in milliseconds between the scheduler polling the database for new tasks. Note that if your handle interval is higher than the amount of time until a new task executes, you task execution will be delayed. | `30000` |
| `maxTaskAge`         | The maximum time-to-live of tasks. If set, the scheduler will clear all tasks that exceed the TTL on start-up                                                                                                             | `false` |

### Distributed Usage

Use the `DistributedScheduler` class if you intend to have multiple competing task handlers per namespace.

## Commands

- `build`: Compiles all Typescript files under `src/` and outputs them to `build/`.
- `check-types`: Uses `tsc` to check all types without emitting any `.js` files.
- `lint-new`: Lints all new work on the branch using eslint
- `lint-branch`: Lints all changes on the current branch when compared to the `main` branch
- `lint-all`: Lints all Typescript files regardless of branch or current changes.
- `format`: Uses prettier to format all files using the default configuration.
- `add-prettier-precommit`: Run this once to enable the prettier commit hook. If executed, prettier will format all
  files before every push.
- `test`: Runs all tests and produces a test coverage report

## Configuration

- `yarn`: This project uses yarn v1. All commands should be run with yarn.
- `eslint`: Uses the default configuration.
- `prettier`: Uses the default configuration.
- `tsconfig`: Uses the default configuration.
- `test`: Users NYC and mocha to run tests and generate a test coverage report
- Default branch: The default branch is `main`.

## FAQ

### My tasks aren't executing on-time. What can I do?
