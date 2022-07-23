import {  nativeImage, BrowserWindow, Tray, Menu } from "electron";
import { app} from "electron";


// copy from https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/
export class TrayGenerator {
  tray:Tray;
  mainWindow:BrowserWindow

  constructor(mainWindow:BrowserWindow) {

    this.tray = null;
    this.mainWindow = mainWindow;
  }
  getWindowPosition = () => {
    const windowBounds = this.mainWindow.getBounds();
    const trayBounds = this.tray.getBounds();
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    const y = Math.round(trayBounds.y + trayBounds.height);
    return { x, y };
  };

  // ref: https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/ 
  // NOTE: setVisibleOnAllWorkspaces is needed ?
  showWindow = () => {
    const position = this.getWindowPosition();
    // this.mainWindow.setPosition(position.x, position.y, false);
    this.mainWindow.show();
    // this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.focus();

    // this.mainWindow.setVisibleOnAllWorkspaces(false);    
  };

  toggleWindow = () => {
    if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.showWindow();
      }
  };

  rightClickMenu = () => {
    const menu:any = [
        {
          role: 'quit',
          accelerator: 'Command+Q'
        }
      ];
      this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  }

  createTray = () => {
    const icon = nativeImage.createFromPath('path/to/asset.png');

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

    this.tray = new Tray(icon);

    let appTitle = ""

  // Open the DevTools.
    const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

    // BUG: https://stackoverflow.com/a/71994055/7354486
    // somehow isPackaged does not work after using webpack to build react in Electron (via electron forge)  
    // if (app.isPackaged) {

    if (!isDebug) {
      appTitle = `XWinP`;
    } else {
      appTitle = 'XWin(alt+cmd+i)';
    }
    this.tray.setToolTip(`XWin app, path:${__dirname}`)
    this.tray.setTitle(appTitle)

    // this.tray = new Tray(path.join(__dirname, './assets/IconTemplate.png'));
    this.tray.setIgnoreDoubleClickEvents(true);
  
    this.tray.on('click', this.toggleWindow);
    this.tray.on('right-click', this.rightClickMenu);
  };
}