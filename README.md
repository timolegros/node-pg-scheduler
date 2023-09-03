# Typescript Project Boiler Place

This is a template for Typescript projects that require strict tsconfig, eslint, and prettier rules.

## Default Assumptions

- `yarn`: This project uses yarn v1. All commands should be run with yarn.
- `eslint`: Uses the default configuration.
- `prettier`: Uses the default configuration.
- `tsconfig`: Uses the default configuration.
- Default branch: The default branch is `main`.

## Default Commands

- `start-dev`: Runs `src/server.ts` with `ts-node-dev` meaning the file is automatically re-run when changes are detected.
- `build`: Compiles all Typescript files under `src/` and outputs them to `build/`.
- `check-types`: Uses `tsc` to check all types without emitting any `.js` files.
- `lint-new`: Lints all new work on the branch using eslint
- `lint-branch`: Lints all changes on the current branch when compared to the `main` branch
- `lint-all`: Lints all Typescript files regardless of branch or current changes.
- `format`: Uses prettier to format all files using the default configuration.
- `add-prettier-precommit`: Run this once to enable the prettier commit hook. If executed, prettier will format all files before every push.
