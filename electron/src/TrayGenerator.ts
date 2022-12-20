import { nativeImage, BrowserWindow, Tray, Menu , app } from 'electron';
import { DBManager, sqlitePathInProd } from './DBManager';
const path = require('path');

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// const prismaPath = require.resolve('prisma')

// ref:
// https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/
export class TrayGenerator {
  tray: Tray;
  mainWindow: BrowserWindow;
  onTrayClickCallback: any;
  title: string;

  constructor(
    mainWindow: BrowserWindow,
    title: string,
    onTrayClickCallback: any,
  ) {
    this.tray = null;
    this.mainWindow = mainWindow;
    this.onTrayClickCallback = onTrayClickCallback;

    this.createTray(title);
  }

  onTrayClick = () => {
    if (this.onTrayClickCallback) {
      this.onTrayClickCallback();
    }
  };

  rightClickMenu = () => {
    const menu: any = [
      {
        role: 'quit',
        accelerator: 'Command+Q',
      },
    ];
    this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  };

  createTray = (title: string) => {
    let icon: Electron.NativeImage;
    if (isDebug) {
      icon = nativeImage.createFromPath('images/16.png');
    } else {
      const resoucePath = path.resolve(`${app.getAppPath()}/../`);
      icon = nativeImage.createFromPath(`${resoucePath}/16.png`);
    }

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

    const appPath = app.getAppPath();

    const error = DBManager.migrateError;
    const info = `db:${DBManager.databaseFilePath};schema:${DBManager.schemaPath};server:${DBManager.serverFolderPath};prismaPath:${DBManager.prismaPath};appPath:${appPath};info.${error}`;

    // DBManager.databaseURL: string = "";
    // DBManager.schemaPath = ""
    // DBManager.serverPath = ""

    // this.tray = new Tray("images/16.png");//icon);
    this.tray = new Tray(icon);

    this.tray.setToolTip(`XWin app.i:${info}`);
    this.tray.setTitle(title);

    // this.tray = new Tray(path.join(__dirname, './assets/IconTemplate.png'));
    // this.tray.setIgnoreDoubleClickEvents(true);

    this.tray.on('click', this.onTrayClick);
    this.tray.on('right-click', this.rightClickMenu);
  };
}
