import { exec } from 'child_process';
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
} from 'electron';
import settings from 'electron-settings';
import { existsSync, readdirSync } from 'fs';
import { DBManager } from './DBManager';
import { isMAS, TrayGenerator } from './TrayGenerator';
import { bootstrap } from './server/server';
import { isDebug } from './utility';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
// Explainer window entry point
declare const EXPLAINER_WINDOW_WEBPACK_ENTRY: string;
// Settings window entry point
declare const SETTINGS_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let tray: TrayGenerator = null;
let mainWindow: BrowserWindow = null;
let explainerWindow: BrowserWindow = null; // Track the code explainer window
let settingsWindow: BrowserWindow = null; // Track the settings window
let serverProcess: any;

const WIN_WIDTH = 800;
const WIN_HEIGHT = 600;

const getWindowPosition = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const x = Math.round(width / 2 - WIN_WIDTH / 2);
  const y = Math.round(height / 2 - WIN_HEIGHT / 2);

  return { x, y };
};

// ref: https://blog.logrocket.com/building-a-menu-bar-application-with-electron-and-react/
// NOTE: setVisibleOnAllWorkspaces is needed ?
const showWindow = () => {
  const position = getWindowPosition();
  mainWindow.setPosition(position.x, position.y, false);
  mainWindow.show();
  // mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.focus();
  // mainWindow.setVisibleOnAllWorkspaces(false);
};

// Handle chat messages from the explainer window
ipcMain.on('send-chat-message', (event, message, messageHistory) => {
  // Get the window that sent this message
  const sender = BrowserWindow.fromWebContents(event.sender);
  if (sender && !sender.isDestroyed()) {
    // Forward the message to AnthropicService
    anthropicService.handleChatMessage(message, sender, messageHistory);
  }
});

const hideWindow = () => {
  mainWindow.hide();
};

const onBlur = (event: any) => {
  hideWindow();
};

const onFocus = (event: any) => {
  mainWindow.webContents.send('window-focus');
};

const createCodeExplainerWindow = (): BrowserWindow => {
  // If window already exists, just return it - visibility is handled by the caller
  if (explainerWindow && !explainerWindow.isDestroyed()) {
    if (explainerWindow.isMinimized()) {
      explainerWindow.restore();
    }
    explainerWindow.focus();
    return explainerWindow;
  }

  // Calculate position to create a semi-transparent floating window
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create window with 800x600 size positioned at the center of the screen
  explainerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: Math.round(width / 2 - 400),
    y: Math.round(height / 2 - 300),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      devTools: true, // Always enable DevTools for debugging
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: true,
    frame: true,
    fullscreenable: false,
    resizable: true,
    // Solid background
    backgroundColor: '#2d2d2d',
    opacity: 1.0,
    // Always on top to ensure visibility
    alwaysOnTop: true,
  });

  // Load the explainer renderer
  explainerWindow.loadURL(EXPLAINER_WINDOW_WEBPACK_ENTRY);

  // Open DevTools in detached mode to help debug
  if (isDebug) {
    explainerWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle window closed event
  explainerWindow.on('closed', () => {
    explainerWindow = null;
  });

  return explainerWindow;
};

const createSettingsWindow = (settingsType: string = 'explainer'): BrowserWindow => {
  // If window already exists, just return it - visibility is handled by the caller
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.focus();
    
    // Send message to switch to the specified settings type
    if (settingsType === 'explainer') {
      settingsWindow.webContents.send('open-explainer-settings');
    } else if (settingsType === 'apiKey') {
      settingsWindow.webContents.send('open-api-key-settings');
    } else if (settingsType === 'leftClick') {
      settingsWindow.webContents.send('open-left-click-settings');
    }
    
    return settingsWindow;
  }
  
  // Calculate position for settings window
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Create settings window
  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: Math.round(width / 2 - 400),
    y: Math.round(height / 2 - 300),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      devTools: true,
      nodeIntegration: false, 
      contextIsolation: true,
    },
    show: true,
    frame: true,
    fullscreenable: false,
    resizable: true,
    backgroundColor: '#1a1a1a',
  });

  // Load the settings renderer with the appropriate settings type as a query parameter
  settingsWindow.loadURL(`${SETTINGS_WINDOW_WEBPACK_ENTRY}?type=${settingsType}`);

  // Open DevTools in detached mode to help debug
  if (isDebug) {
    settingsWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  // Handle window closed event
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
};

const createWindow = (): BrowserWindow => {
  // Create the browser window.
  const window = new BrowserWindow({
    // maximizable: false,
    // minimizable: false, // ux not good
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      devTools: true, //isDebug,
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
  // window.webContents.openDevTools();
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

  window.on('move', () => {
    const bounds = mainWindow.getBounds();
    const currentDisplay = screen.getDisplayNearestPoint({
      x: bounds.x,
      y: bounds.y,
    });

    showWindow();
  });

  return window;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  if (isDebug) {
    console.log('on ready');
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (isDebug) {
    console.log('window-all-closed');
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/** not triggered yet */
app.on('activate', () => {
  if (isDebug) {
    console.log('activate');
  }
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});

/** https://www.electronjs.org/docs/latest/tutorial/ipc */
ipcMain.on('invoke-vscode', (event, path, option) => {
  if (isDebug) {
    console.log('invoke', { /*event,*/ path });
    tray.tray.setTitle(`XWin(${path ? path[path.length - 1] : 'n'})`);
  }

  if (!existsSync(path)) {
    if (isDebug) {
      console.log('file not exist');
    }
    // send message to Electron, not really use now, just in case
    mainWindow.webContents.send('xwin-not-found');

    dialog.showMessageBox(mainWindow, {
      message: 'Path is not a folder, neither workspace',
      buttons: ['OK'],
      defaultId: 0, // bound to buttons array
      cancelId: 1, // bound to buttons array
    });

    return;
  }

  /** TODO: use Node.js path.join() instead of manual concat */
  // FIXME: win/linux has difference path
  // ref:
  // 1. https://stackoverflow.com/questions/44405523/spawn-child-node-process-from-electron
  // 2. https://stackoverflow.com/questions/62885809/nodejs-child-process-npm-command-not-found
  // 3. https://github.com/electron/fiddle/issues/365#issuecomment-616630874
  // const fullCmd = `code ${command}`
  // const child = spawn('open', ['-b', 'com.microsoft.VSCode', '--args', argv], options);
  // https://github.com/microsoft/vscode/issues/102975#issuecomment-661647219
  // const fullCmd = `open -b com.microsoft.VSCode --args -r ${path}`

  let fullCmd = '';
  const newPath = path.replace(/ /g, '\\ ');
  if (option) {
    // reuse
    // https://stackoverflow.com/a/47473271/7354486
    // https://code.visualstudio.com/docs/editor/command-line#_opening-vs-code-with-urls
    fullCmd = `open vscode://file/${newPath}`;
  } else {
    // NOTE: VSCode insider needs to use "com.microsoft.VSCodeInsiders" instead
    fullCmd = `open -b com.microsoft.VSCode ${newPath}`;
  }

  if (isDebug) {
    console.log({ fullCmd });
  }
  exec(fullCmd, (error, stdout, stderr) => {
    if (isDebug) {
      console.log(stdout);
    }
  });

  hideWindow();
});

ipcMain.on('pop-alert', (event, alert: string) => {
  dialog.showMessageBox(mainWindow, {
    message: alert,
    buttons: ['OK'],
    defaultId: 0, // bound to buttons array
    cancelId: 1, // bound to buttons array
  });
});

ipcMain.on('search-working-folder', (event, path: string) => {
  if (!path) {
    return;
  }

  console.time('readdir');

  // 0.2ms ~ 100 item
  // 0.27ms ~ 2item
  // 0.4ms for git folder, ~200
  /** TODO: use async way to improve performance */
  const directoriesInDIrectory = readdirSync(path, {
    withFileTypes: true,
  });

  /** readdir-all subfolder: 96.554ms */
  const returnPathlist = [];
  // const subListCount = 0; // 3785
  for (const item of directoriesInDIrectory) {
    if (item.name.startsWith('.')) {
      continue;
    }

    const itemPath = path + '/' + item.name;
    if (!item.isDirectory()) {
      if (item.name.endsWith('.code-workspace')) {
        returnPathlist.push(itemPath);
      }
      continue;
    }
    returnPathlist.push(itemPath);

    // TODO: this is macOs path style. use Node.js path.join()
    const targetSpacePath = itemPath + '/' + item.name + '.code-workspace';
    if (existsSync(targetSpacePath)) {
      returnPathlist.push(targetSpacePath);
      // if (targetSpacePath.endsWith('.code-workspace')) {
      //   console.log('targetSpacePath,', targetSpacePath);
      // }
    }
  }

  console.timeEnd('readdir');
  console.log({ returnPathlist: returnPathlist.length });

  mainWindow.webContents.send('working-folder-iterated', returnPathlist);
});

ipcMain.on('hide-app', (event) => {
  hideWindow();
});

ipcMain.on('close-app-click', async (event) => {
  app.quit();
});

// Settings window handlers
ipcMain.on('open-settings', (event, settingsType = 'explainer') => {
  createSettingsWindow(settingsType);
});

// Create Settings windows from tray menu
ipcMain.on('open-explainer-settings', () => {
  createSettingsWindow('explainer');
});

ipcMain.on('open-api-key-settings', () => {
  createSettingsWindow('apiKey');
});

ipcMain.on('open-left-click-settings', () => {
  createSettingsWindow('leftClick');
});

// Import our Anthropic service
import anthropicService from './AnthropicService';

// Track user settings
let userSettings = {
  leftClickBehavior: 'main_window', // Default behavior
};

// Track the last explained code to detect changes
let lastExplainedCode = '';

// Handle the request to open Code Explainer window
ipcMain.on('open-code-explainer', (event, code) => {
  // Check if code is the same as previously explained
  const codeChanged = code !== lastExplainedCode;
  lastExplainedCode = code;

  const explainerWindow = createCodeExplainerWindow();

  // Send the code to the window once it's loaded
  explainerWindow.webContents.once('did-finish-load', () => {
    explainerWindow.webContents.send('code-to-explain', code);

    // Start explaining code using the Anthropic service
    anthropicService.explainCode(code, explainerWindow);
  });
});

ipcMain.on('open-folder-selector', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    securityScopedBookmarks: true,
    // properties: ['openFile', 'multiSelections'],
  });
  /** https://gist.github.com/ngehlert/74d5a26990811eed59c635e49134d669 */
  const { canceled, filePaths, bookmarks } = result;
  if (canceled || filePaths.length === 0) {
    return;
  }
  if (bookmarks && bookmarks.length) {
    // store the bookmark key
    if (isMAS()) {
      await settings.set('security-scoped-bookmark', bookmarks[0]);
    }
  }

  const folderPath = filePaths[0];

  mainWindow.webContents.send('folder-selected', folderPath);
});

// Load settings from database
const loadUserSettings = async () => {
  try {
    const response = await fetch('http://localhost:55688/explainer-settings');
    if (response.ok) {
      const settings = await response.json();
      if (settings) {
        userSettings.leftClickBehavior = settings.leftClickBehavior || 'main_window';
      }
    }
  } catch (error) {
    console.error('Failed to load user settings:', error);
  }
};

// Handle Tray icon left-click based on user settings
const trayToggleEvtHandler = async () => {
  if (isDebug) {
    console.log('tray toggle callback');
  }
  
  // Make sure settings are loaded
  await loadUserSettings();
  
  // Handle different click behaviors
  if (userSettings.leftClickBehavior === 'code_explainer') {
    // Open Code Explainer with clipboard content
    const clipboard = require('electron').clipboard;
    const selectedCode = clipboard.readText().trim();
    
    if (selectedCode && selectedCode.length > 0) {
      // Create or focus explainer window
      const explainerWin = createCodeExplainerWindow();
      
      // Send the code to explain
      explainerWin.webContents.once('did-finish-load', () => {
        explainerWin.webContents.send('code-to-explain', selectedCode);
        anthropicService.explainCode(selectedCode, explainerWin);
      });
      
      // If already loaded, send directly
      if (!explainerWin.webContents.isLoading()) {
        explainerWin.webContents.send('code-to-explain', selectedCode);
        anthropicService.explainCode(selectedCode, explainerWin);
      }
    } else {
      // No code in clipboard, show main window as fallback
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        showWindow();
      } else if (mainWindow && mainWindow.isVisible()) {
        hideWindow();
      } else if (mainWindow) {
        showWindow();
      }
    }
  } else {
    // Default behavior - toggle main window
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isDebug) {
        console.log('no window, create one');
      }
      mainWindow = createWindow();
      showWindow();
    } else if (mainWindow && mainWindow.isVisible()) {
      if (isDebug) {
        console.log('is visible, to hide');
      }
      hideWindow();
    } else if (mainWindow) {
      if (isDebug) {
        console.log('is not visible, to show');
      }
      showWindow();
    }
  }
};

/**
 * what is the difference between whenReady & .on('ready)???
 */
(async () => {
  await app.whenReady();

  mainWindow = createWindow();
  if (isDebug) {
    console.log('when ready');
  }
  DBManager.initPath();
  // console.log({
  //   node: process?.env?.NODE_ENV,
  //   DEBUG_PROD: process.env.DEBUG_PROD,
  //   isUnPackaged: isUnPackaged,
  // });
  const needVer = await DBManager.checkNeedMigration();
  if (needVer) {
    await DBManager.doMigrationToVersion(needVer);
  }
  if (isDebug) {
    console.log('check db done. USE DBPATH:', DBManager.databaseFilePath);
  }

  if (isMAS()) {
    const securityBookmark = (await settings.get(
      'security-scoped-bookmark',
    )) as string;
    if (securityBookmark) {
      app.startAccessingSecurityScopedResource(securityBookmark);
    }
  }

  console.log('create server');
  process.env.DATABASE_URL = `file:${DBManager.databaseFilePath}`;
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = DBManager.queryExePath;
  await bootstrap();
  console.log('create server done');

  // Load user settings
  await loadUserSettings();

  let title = '';
  if (!isDebug) {
    title = ``;
  } else {
    title = `CodeV(cmd+ctrl+r/e)`;
    if (DBManager.needUpdate) {
      title = `${title}${'u.'}`;
    }
  }

  tray = new TrayGenerator(mainWindow, title, trayToggleEvtHandler);

  // https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts#global-shortcuts
  // Register Cmd+Ctrl+R shortcut to always show the main window, regardless of left-click setting
  globalShortcut.register('Command+Control+R', () => {
    if (isDebug) {
      console.log('Command+Control+R triggered - always shows main window');
    }
    
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isDebug) {
        console.log('No window, creating main window');
      }
      mainWindow = createWindow();
      showWindow();
    } else if (mainWindow && mainWindow.isVisible()) {
      if (isDebug) {
        console.log('Main window visible, hiding it');
      }
      hideWindow();
    } else if (mainWindow) {
      if (isDebug) {
        console.log('Main window exists but hidden, showing it');
      }
      showWindow();
    }
  });

  // Register shortcut for Code Explainer (Ctrl+Cmd+E)
  globalShortcut.register('Command+Control+E', () => {
    if (isDebug) {
      console.log('Code Explainer shortcut triggered');
    }

    // Get selected text from clipboard
    const clipboard = require('electron').clipboard;
    const selectedCode = clipboard.readText().trim();

    // Check if this is different from previous code
    const codeChanged = selectedCode !== lastExplainedCode;

    if (isDebug) {
      console.log(
        'Code changed:',
        codeChanged,
        'Current length:',
        selectedCode.length,
      );
    }

    // Only process if code is valid
    if (selectedCode && selectedCode.length > 0) {
      // Update the tracked code
      lastExplainedCode = selectedCode;

      // Check if window already exists
      if (explainerWindow && !explainerWindow.isDestroyed()) {
        // If window is visible but code changed, just update content
        if (explainerWindow.isVisible() && codeChanged) {
          console.log('Updating existing window with new code');

          // Send the new code
          explainerWindow.webContents.send('code-to-explain', selectedCode);

          // Start new explanation
          anthropicService.explainCode(selectedCode, explainerWindow);
          return;
        }

        // If window is visible but code is same, toggle visibility
        if (explainerWindow.isVisible() && !codeChanged) {
          console.log('Hiding window, same code');
          explainerWindow.hide();
          return;
        }

        // If window exists but hidden, show it
        if (!explainerWindow.isVisible()) {
          console.log('Showing existing window');
          explainerWindow.show();

          // Always send the code and request new explanation when showing the window again
          // This ensures a fresh explanation even if the code hasn't changed
          explainerWindow.webContents.send('code-to-explain', selectedCode);
          anthropicService.explainCode(selectedCode, explainerWindow);
          return;
        }
      }

      // Create a new window if we didn't return yet
      console.log('Creating new explainer window');
      explainerWindow = createCodeExplainerWindow();

      // Send the code once the window is ready
      const processCode = () => {
        if (!explainerWindow.isVisible()) {
          explainerWindow.show();
        }

        // Send code with a slight delay to ensure renderer is ready
        setTimeout(() => {
          explainerWindow.webContents.send('code-to-explain', selectedCode);
          anthropicService.explainCode(selectedCode, explainerWindow);
        }, 200);
      };

      // Handle window loading state
      if (explainerWindow.webContents.isLoadingMainFrame()) {
        explainerWindow.webContents.once('did-finish-load', processCode);
      } else {
        processCode();
      }
    } else if (explainerWindow && explainerWindow.isVisible()) {
      // No code but window is visible - show a notification
      dialog.showMessageBox({
        type: 'info',
        title: 'No Code Found',
        message: 'No code was found in the clipboard.',
        detail:
          'Please select your code and press Cmd+C to copy it first, then press Ctrl+Cmd+E to explain it.',
        buttons: ['OK'],
      });
    }
  });
})();

// use lsof -i:55688 to check server process
// ref:
// 1. https://stackoverflow.com/questions/36031465/electron-kill-child-process-exec
// 2. https://stackoverflow.com/questions/42141191/electron-and-node-on-windows-kill-a-spawned-process
// Workaround to close all processes / sub-processes after closing the app
// app.once('window-all-closed', app.quit); ? seems not important
// mainWindow.removeAllListeners('close'); ? seems not important
app.once('before-quit', () => {
  if (isDebug) {
    console.log('before quit, kill server process');
  }
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.setLoginItemSettings({
  openAtLogin: true,
});

app.dock.hide();
