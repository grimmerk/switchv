import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";

import { exec } from 'child_process'
import {TrayGenerator} from './TrayGenerator';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

console.log({NODE_ENV: process.env.NODE_ENV});
console.log({DEBUG_PROD: process.env.DEBUG_PROD}); // undefined in local dev 

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
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    }

    // hide window by default
    // show: false,
    // frame: false,
    // fullscreenable: false,
    // resizable: false,
  });

  // and load the index.html of the app.
  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  // const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
  // console.log({isDebug})

  if (true){ //isDebug){//!app.isPackaged) {
    window.webContents.openDevTools();
  }
  
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
ipcMain.on('invoke-vscode', (event, path) => {
  console.log("invoke", {event, path});

  tray.tray.setTitle(`XWin(${path?path[path.length-1]:"n"})`);

  // FIXME: win/linux has difference path
  // ref:
  // 1. https://stackoverflow.com/questions/44405523/spawn-child-node-process-from-electron
  // 2. https://stackoverflow.com/questions/62885809/nodejs-child-process-npm-command-not-found
  // 3. https://github.com/electron/fiddle/issues/365#issuecomment-616630874
  // const fullCmd = `code ${command}`
  const fullCmd = `/usr/local/bin/code ${path}`
  exec(fullCmd, (error, stdout, stderr) => { 
    console.log(stdout);
  });
  
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

  if (!isDebug) {
    // spwan a procees
    // console.log("launch serer ", __dirname)
    
    // ref: const child = exec(`node ./index.js --config ./config.js ${flags} --json ${timestamp}.json --console none`);
    // TODO: how to use vercel/pkg bundle deb.db in nestjs  ????
    // exec(`${__dirname}/xwin-server-macos`,  {env: {'DATABASE_URL': 'file:dev.db'}}, (error, stdout, stderr) => { 

    // works in development, not test in production but should work
    // exec(`${__dirname}/xwin-server-macos`,  {env: {'DATABASE_URL': 'file:/Users/grimmer/git/xwin/server/prisma/dev.db'}}, (error, stdout, stderr) => { 
    
    // works in production &  development
    // x TODO: close the packaged app seems not close xwin-server-macos? check by command: lsof -i:55688. Development (npm run start) is OK
    //  add close button on tray?
    // NOTE: if it is running smoothly, it will not print any logs. But if it happens to read db error, it will show some logs
    // ~/git/xwin/electron/out/electron-darwin-arm64/electron.app/Contents/Resources/app/.webpack/main   m
    const serverPath = `${__dirname}/../../../`
    serverProcess = exec(`${serverPath}xwin-server-macos`,  {env: {'DATABASE_URL': `file:${serverPath}prisma/dev.db`}}, (error, stdout, stderr) => { 
      // TODO: figure out it why
      console.log("print server log but seems it is never callbacked")
      console.log(error, stderr)      
      console.log(stdout);
    });
  }


  let title = "XWin"
  if (!isDebug) {    

    console.log({NODE_ENV: process.env.NODE_ENV});
    console.log({DEBUG_PROD: process.env.DEBUG_PROD}); 
  
    const node_evn = process.env.NODE_ENV??"" 
    const debug_prod = process.env.DEBUG_PROD??"" 

    title = `${title}P.`;
    title = `${title}${node_evn}`;
    title = `${title}${debug_prod}`;
  } else {
    title = `${title}(alt+cmd+i)`;
  }
  tray = new TrayGenerator(mainWindow, title, trayToggleEvtHandler);

  // https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts#global-shortcuts
  globalShortcut.register('Alt+CommandOrControl+I', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("no window, create one")
      mainWindow = createWindow();
      showWindow();
    } else {
      tray.onTrayClick();
    }
  })
})();


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