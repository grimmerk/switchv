# XWin 

Use this to quickly open and switch projects. 

## Features

- use ~~command line~~ shortcut/tray menu to quickly launch a UI listing recent opened window with different project paths, then select one to open it in VSCode.

## Dev and package Note

- extension
  - `npm install` (since `vsce package` requires `npm`)
  - either 
    - `F5 debug` for debugging or 
    - built it and install it. Firstly 
      - install [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
      - `vsce package`, 
      - then `code --install-extension xwin-0.0.1.vsix` to install. 
- server 
  - `yarn install` 
  - For the first time or every time db scheme changes, execute `yarn db:migrate` to generate SQLite DB file (`./prisma/dev.db`) and generate TypeScript interface. `yarn db:view` can be used to view DB data.
    - ~~To generate TypeScript DB interface, `yarn db:type` (db:migrate will also automatically do this part)~~
  - F5 debug or `yarn start:debug`
- desktop/electron 
  - `yarn install`
  - `yarn start` (not set VSCode debugging yet)
  - package as mac app: `yarn make`. It (Electron part) is about 196MB. Server vercel/pkg build is 119MB. Total it is 316MB. Try Tauri to reduce electron part? 

### pnpm tips:

- `pnpm install` vs `npm install`
- `pnpm dlx` vs `npx` 

ref: https://pnpm.io/pnpm-cli

## issues/todos 

1. [fixed] after click one window item, show VSCode, first time "cmd+option+i" trigger does not effect and always need the second time. 

2. [fixed] after using ctrl+w to close XWin, the window object will be destroyed and can not be used anymore (will throw exception)

3. Sometimes tray menu will not show. It seems to be because too many menu apps?

4. Frontend usually fails to fetch data from server since the server is starting firstly. Need refresh. Add some waiting time. 

5. Insecure Content-Security-Policy warning 

6. React App is called twice initially

## notes about packaging a macOS app

steps: 
1. bundle server 
  1. in server, execute `yarn start` to generate dist folder
  2. `yarn global add pkg`
  3. add `"version": "0.0.1"` field in `generated server/node_modules/.prisma/client/package.json`
  4. in server, `pkg .`
2. in electron, `yarn make` to generate out folder 

two issues 
1. TODO: how to use vercel/pkg bundle deb.db in nestjs, instead of manual copy????
2. x TODO: close the packaged app via cmd+q seems not close xwin-server-macos process? check by command: lsof -i:55688. Use ctrl+c to stop development (running via yarn start) is OK. (add close button on tray to help? I guess it is not helping). Solved by electron send kill server process in the before-quick event handler. Another person suggests to add one more step to handle SIGINT signal on server side, ref https://stackoverflow.com/questions/71523442/child-process-doesnt-exit.

### server notes
ref: 
1. https://github.com/prisma/prisma/issues/8449
2. https://github.com/vercel/pkg/issues/1508

