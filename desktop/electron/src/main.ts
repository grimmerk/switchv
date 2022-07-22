import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import * as path from "path";

import { exec } from 'child_process'
import {TrayGenerator} from './TrayGenerator';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line global-require
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow:BrowserWindow = null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    webPreferences: {
      // used in https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/
      // nodeIntegration: true ?
      preload: path.join(__dirname, "preload.js"),
    },
    width: 800,

    //  hide window by default
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
  });

  /** https://www.electronjs.org/docs/latest/tutorial/ipc */
  ipcMain.on('invoke-vscode', (event, command) => {
    console.log("invoke", {event, command});

    exec(command, (error, stdout, stderr) => { 
      console.log(stdout);
    });


    // const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}


/** 
 * what is the difference between whenReady & .on('ready)???
 */
app.whenReady().then(() => {

  if (app.isPackaged) {
    // spwan a procees
    console.log("launch serer ", __dirname)
    
    // ref: const child = exec(`node ./index.js --config ./config.js ${flags} --json ${timestamp}.json --console none`);
    // TODO: how to use vercel/pkg bundle deb.db in nestjs  ????
    // exec(`${__dirname}/xwin-server-macos`,  {env: {'DATABASE_URL': 'file:dev.db'}}, (error, stdout, stderr) => { 

    // works in development, not test in production but should work
    // exec(`${__dirname}/xwin-server-macos`,  {env: {'DATABASE_URL': 'file:/Users/grimmer/git/xwin/server/prisma/dev.db'}}, (error, stdout, stderr) => { 
    
    // works in production &  development
    // TODO: close the packaged app seems not close xwin-server-macos? check by command: lsof -i:55688. Development (npm run start) is OK
    //  add close button on tray?
    exec(`${__dirname}/xwin-server-macos`,  {env: {'DATABASE_URL': `file:${__dirname}/prisma/dev.db`}}, (error, stdout, stderr) => { 
        console.log("laun3", error, stderr)      
        console.log(stdout);
    });

    console.log("launch serer2 ")

  }

  const tray = new TrayGenerator(mainWindow);
  tray.createTray();
  // ref: https://www.electronjs.org/docs/latest/tutorial/tray
  // const icon = nativeImage.createFromPath('path/to/asset.png');
  // tray = new Tray(icon);
  // const contextMenu = Menu.buildFromTemplate([
  //   { label: 'Item1', type: 'radio' },
  //   { label: 'Item2', type: 'radio' },
  //   { label: 'Item3', type: 'radio', checked: true },
  //   { label: 'Item4', type: 'radio' }
  // ])
  // tray.setContextMenu(contextMenu)
  // tray.setToolTip('This is my XWin application')
  // tray.setTitle('This is my XWin title')
  // note: your contextMenu, Tooltip and Title code will go here!


  // https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts#global-shortcuts
  globalShortcut.register('Alt+CommandOrControl+I', () => {
    console.log('Electron loves global shortcuts!')
    tray.toggleWindow();
  })
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.setLoginItemSettings({
  openAtLogin: true,
});

app.dock.hide();

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
