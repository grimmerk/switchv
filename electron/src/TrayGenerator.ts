import {  nativeImage, BrowserWindow, Tray, Menu } from "electron";
import { app} from "electron";


// ref: 
// https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/
export class TrayGenerator {
  tray:Tray;
  mainWindow:BrowserWindow
  onTrayClickCallback:any;
  title: string;

  constructor(mainWindow:BrowserWindow, title: string, onTrayClickCallback:any) {

    this.tray = null;
    this.mainWindow = mainWindow;
    this.onTrayClickCallback = onTrayClickCallback;

    this.createTray(title);
  }

  // not used now
  getWindowPosition = () => {
    const windowBounds = this.mainWindow.getBounds();
    const trayBounds = this.tray.getBounds();
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    const y = Math.round(trayBounds.y + trayBounds.height);
    return { x, y };
  };

  onTrayClick = () => {
    if (this.onTrayClickCallback) {
      this.onTrayClickCallback();
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

  createTray = (title:string) => {
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
    this.tray.setToolTip(`XWin app, path:${__dirname}`)
    this.tray.setTitle(title)

    // this.tray = new Tray(path.join(__dirname, './assets/IconTemplate.png'));
    // this.tray.setIgnoreDoubleClickEvents(true);
  
    this.tray.on('click', this.onTrayClick);
    this.tray.on('right-click', this.rightClickMenu);
  };
}