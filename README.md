# XWin 

Use this to quickly open and switch projects. 

## Features

- use ~~command line~~ shortcut/tray menu to quickly launch a UI listing recent opened window with different project paths, then select one to open it in VSCode.

## Note

### Use pnpm for package management

- extension
  - pnpm install
  - F5 debug
- server 
  - pnpm install
  - To generate SQLite DB file (`./prisma/dev.db`) for the first time: `pnpm db:migrate`. `pnpm db:view` can be used to view DB data.
  - F5 debug
- desktop/electron 
  - pnpm install
  - pnpm start (not set VSCode debugging yet)


tips:
- `pnpm install` vs `npm install`
- `pnpm dlx` vs `npx` 

ref: https://pnpm.io/pnpm-cli

