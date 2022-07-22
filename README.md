# XWin 

Use this to quickly open and switch projects. 

## Features

- use ~~command line~~ shortcut/tray menu to quickly launch a UI listing recent opened window with different project paths, then select one to open it in VSCode.

## Note

### Use pnpm for package management

Below `pnpm` is already replaced by `npm`.  

- extension
  - ~~`pnpm install` or~~ `npm install` (since `vsce package` requires `npm`)
  - either 
    - `F5 debug` for debugging or 
    - built it and install it. Firstly 
      - install [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
      - `vsce package`, 
      - then `code --install-extension xwin-0.0.1.vsix` to install. 
- server 
  - pnpm install
  - To generate SQLite DB file (`./prisma/dev.db`) for the first time: `pnpm db:migrate`. `pnpm db:view` can be used to view DB data.
  - To generate TypeScript DB interface, `npm run db:type` (not sure if db:migrate will generate TypeScript types or not)
  - F5 debug or `pnpm start:debug`
- desktop/electron 
  - pnpm install
  - pnpm start (not set VSCode debugging yet)
  - package as mac app: `pnpm make`. It (Electron part) is about 196MB. Server vercel/pkg build is 119MB. Total it is 316MB. Try Tauri to reduce electron part? 


tips:
- `pnpm install` vs `npm install`
- `pnpm dlx` vs `npx` 

ref: https://pnpm.io/pnpm-cli

## notes about packaging a macOS app

steps: 
1. in server, execute `npm run start` to generate dist folder
2. `npm install -g pkg`
3. in server, `pkg .`
4. in electron, `npm run start` to generate dist folder 
5. copy server's `xwin-server-macos` and `prisma folder` into dist folder 
6. `npm run make`

two issues 
1. TODO: how to use vercel/pkg bundle deb.db in nestjs, instead of manual copy????
2. x TODO: close the packaged app via cmd+q seems not close xwin-server-macos process? check by command: lsof -i:55688. Use ctrl+c to stop development (running via npm run start) is OK. (add close button on tray to help? I guess it is not helping). Solved by electron send kill server process in the before-quick event handler. Another person suggests to add one more step to handle SIGINT signal on server side, ref https://stackoverflow.com/questions/71523442/child-process-doesnt-exit.

### server 
ref: 
1. https://github.com/prisma/prisma/issues/8449
2. https://github.com/vercel/pkg/issues/1508

