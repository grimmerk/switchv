# XWin Server

## Installation

```bash
$ pnpm install
```

## Running the app

To generate SQLite DB file (`./prisma/dev.db`) for the first time: `pnpm db:migrate`. `pnpm db:view` can be used to view DB data.

```bash
# development
$ pnpm start

# watch mode
$ ppnpm start:dev

# production mode
$ pnpm start:prod
```

## Test

```bash
# unit tests
$ pnpm test

# e2e tests
$ pnpm test:e2e

# test coverage
$ pnpm test:cov
```
