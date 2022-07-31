import { dialog, app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import { exec } from 'child_process';
import { existsSync } from 'fs';

import { TrayGenerator } from './TrayGenerator';
import { DBManager } from "./DBManager";

/** TODO: use Node.js path.join() instead of manual concat */

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

console.log({NODE_ENV: process.env.NODE_ENV});     // defined in dev/packaged 
// console.log({DEBUG_PROD: process.env.DEBUG_PROD}); // not defined in dev/packaged 

// BUG: https://stackoverflow.com/a/71994055/7354486
// somehow isPackaged does not work after using webpack to build react in Electron (via electron forge)  
// if (app.isPackaged) {
const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// default: http://localhost:3000/main_window
// console.log("MAIN_WINDOW_WEBPACK_ENTRY:", MAIN_WINDOW_WEBPACK_ENTRY) 
// default: undefind. Its value is from package.json entryPoints/preload/js value 
// console.log("MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY:", MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY)

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let tray:TrayGenerator = null;
let mainWindow:BrowserWindow = null;
let serverProcess:any; 

// ref: https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/ 
// NOTE: setVisibleOnAllWorkspaces is needed ?
const showWindow = () => {
  // const position = this.getWindowPosition();
  // mainWindow.setPosition(position.x, position.y, false);
  mainWindow.show();
  // mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.focus();
  // mainWindow.setVisibleOnAllWorkspaces(false);    
};

const hideWindow = () =>{
  mainWindow.hide();
}

const onBlur = (event:any)=>{
  hideWindow();
}

const onFocus = (event:any)=>{
  console.log("onFocus:");
  mainWindow.webContents.send('window-focus');
}

const createWindow = (): BrowserWindow => {
  // Create the browser window.
  const window = new BrowserWindow({
    // minimizable: false, // ux not good
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },

    // hide window by default
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
  });

  // and load the index.html of the app.
  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // if (true){ //isDebug){//!app.isPackaged) {
  //   window.webContents.openDevTools();
  // }
  
  if (tray) {
    // TODO: change to use some Tray method & not set tray here
    tray.mainWindow = window;
  }

  window.on('blur', onBlur);
  window.on('focus', onFocus);

  // mainWindow.on('close', function (event) {
  //   console.log("mainWindow close");  
  //   // if below is setup, app.window-all-closed will not be fired 
  //   // if(!application.isQuiting){
  //   // event.preventDefault();
  //   // mainWindow.hide();
  //   // // }  
  //   // return false;
  // });

  return window;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', ()=>{
  console.log("on ready");
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  console.log('window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/** not triggered yet */
app.on('activate', () => {
  console.log('activate')
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

/** https://www.electronjs.org/docs/latest/tutorial/ipc */
ipcMain.on('invoke-vscode', (event, path, option) => {
  console.log("invoke", {event, path});

  tray.tray.setTitle(`XWin(${path?path[path.length-1]:"n"})`);

  if (!existsSync(path)){
    console.log("file not exist")
    // send message to Electron, not really use now, just in case 
    mainWindow.webContents.send('xwin-not-found');
    // dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))

    dialog.showMessageBox(mainWindow,{
      message: "Path is not a folder, neither worksapce",
      buttons: ["OK"],
      defaultId: 0, // bound to buttons array
      cancelId: 1 // bound to buttons array
    });

    return; 
  } else {
    console.log("file exist")
  }

  // FIXME: win/linux has difference path
  // ref:
  // 1. https://stackoverflow.com/questions/44405523/spawn-child-node-process-from-electron
  // 2. https://stackoverflow.com/questions/62885809/nodejs-child-process-npm-command-not-found
  // 3. https://github.com/electron/fiddle/issues/365#issuecomment-616630874
  // const fullCmd = `code ${command}`
  //const child = spawn('open', ['-b', 'com.microsoft.VSCode', '--args', argv], options);
  // https://github.com/microsoft/vscode/issues/102975#issuecomment-661647219
  //const fullCmd = `open -b com.microsoft.VSCode --args -r ${path}`

  let fullCmd="";
  if (option) {
    // reuse 
    // https://stackoverflow.com/a/47473271/7354486
    // https://code.visualstudio.com/docs/editor/command-line#_opening-vs-code-with-urls
    fullCmd = `open vscode://file/${path}`;
  } else {
    // NOTE: VSCode insider needs to use "com.microsoft.VSCodeInsiders" instead 
    fullCmd = `open -b com.microsoft.VSCode ${path}`;
  }

  console.log({fullCmd})
  exec(fullCmd, (error, stdout, stderr) => { 
    console.log(stdout);
  });
  
  hideWindow();
});  

ipcMain.on('hide-app', (event) => {
  hideWindow();
});  


const trayToggleEvtHandler = () => {
  console.log("tray toggle callback");
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("no window, create one")
    mainWindow = createWindow();
    showWindow();
  } else if (mainWindow.isVisible()) {
    console.log("is visible, to hide")
    hideWindow();
  } else {
    console.log("is not visible, to show")
    showWindow();
  }  
};

/** 
 * what is the difference between whenReady & .on('ready)???
 */
// app.whenReady().then(() => {
// })
(async ()=>{
  await app.whenReady();
  mainWindow = createWindow();
  console.log("when ready");
  console.log("check db");
  DBManager.initPath();
  const needVer = await DBManager.checkNeedMigration();
  if (needVer) {
    if (process.env.EMBEDSERVER || !isDebug) {
      await DBManager.doMigrationToVersion(needVer);
    }
  }
  console.log("check db done");

  console.log("USE DBPATH:", DBManager.databaseFilePath)

  if (process.env.EMBEDSERVER || !isDebug) {
    process.env.DATABASE_URL = `file:${DBManager.databaseFilePath}`;
    console.log("start server");
    serverProcess = exec(`${DBManager.serverFolderPath}/xwin-server-macos`,  
      {env: {'DATABASE_URL': `file:${DBManager.databaseFilePath}`}}, 
      (error, stdout, stderr) => { 
      // TODO: figure out it why it does not print out
      // NOTE: if it is running smoothly, it will not print any logs. But if it seems that it happens to read db error, 
      // then it will show some logs
      console.log("print server log but seems it is never callbacked")
      console.log(error, stderr)      
      console.log(stdout);
    });
  }

  let title = "XWin"
  if (!isDebug) {    
    title = `${title}P.`;
  } else {
    title = `${title}(cmd+option+n)`;
  }

  if (DBManager.needUpdate) {
    title = `${title}${"u."}`;
  }

  tray = new TrayGenerator(mainWindow, title, trayToggleEvtHandler);

  // https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts#global-shortcuts
  globalShortcut.register('Alt+CommandOrControl+N', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("no window, create one")
      mainWindow = createWindow();
      showWindow();
    } else {
      tray.onTrayClick();
    }
  })
})();

// use lsof -i:55688 to check server process
// ref:
// 1. https://stackoverflow.com/questions/36031465/electron-kill-child-process-exec
// 2. https://stackoverflow.com/questions/42141191/electron-and-node-on-windows-kill-a-spawned-process
// Workaround to close all processes / sub-processes after closing the app
// app.once('window-all-closed', app.quit); ? seems not important 
// mainWindow.removeAllListeners('close'); ? seems not important
app.once('before-quit', () => {
  console.log("before quit, kill server process")
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.setLoginItemSettings({
  openAtLogin: true,
});

app.dock.hide();