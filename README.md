# CodeV 

Use this to quickly open and switch VS Code projects, and use AI assistant to analyze your code and chat with it instantly. 

## Features

- use shortcut/tray menu to quickly launch a UI listing recent opened window with different project paths, then select one to open it in VS Code.
- (wip) AI Assistant features. 

## Dev and package Note

- extension (for VS Code quick switcher feature)
  - `yarn install`
  - either 
    - `F5 debug` for debugging or 
    - built it and install it. Firstly 
      - install [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
      - `yarn make`, 
      - `yarn load` (first time) & `yarn reload` to install. 
- electron (desktop app)
  - `yarn install`
  - DB setup 
    - For the first time or every time db scheme changes, execute `yarn db:migrate` to generate SQLite DB file (`./prisma/dev.db`) and generate TypeScript interface. `yarn db:view` can be used to view DB data.
      - `db:migrate` will also automatically do this part, `yarn install` will also include generated types in node_modules/.prisma/index.d.ts)
  - `yarn start` (not set VS Code debugging yet)
  - package as mac app: `yarn make`. It (Electron part) is about 196MB.
  - build mas build: `yarn make_mas`. Then execute `sh ./sign.sh`.

### Use VS Code Debugger  

#### To debug main process**

In VS Code Run and Debug, choose `Electron: Main Process` to launch and debug.

#### To debug render process, please directly set up breakpoints in the opened dev tool instead, which is what Electron official site recommends **

Ref: https://www.electronjs.org/docs/latest/tutorial/application-debugging#renderer-process. 

p.s. We had tried to use VS Code debugger setting for this, but it became invalid after migrating to the new version of Electron.

## notes about packaging a macOS app

Steps: 
1. Follow [Prepare provisioning profile](https://www.electronjs.org/) section on https://www.electronjs.org/ to get `yourapp.provisionprofile` and download it as `electron/embedded.provisionprofile`.
2. in electron, `yarn make` to generate out folder 

### Server packaging takeway notes 

ref: 
1. https://github.com/prisma/prisma/issues/8449
2. ~~https://github.com/vercel/pkg/issues/1508~~ (we had use vercel/pkg to package server but we have decided to embed server to electron)

