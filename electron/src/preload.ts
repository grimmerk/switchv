// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invokeVSCode: (path: string, option: string) =>
    ipcRenderer.send('invoke-vscode', path, option),

  hideApp: () => ipcRenderer.send('hide-app'),
  openFolderSelector: () => ipcRenderer.send('open-folder-selector'),
  closeAppClick: () => ipcRenderer.send('close-app-click'),
  popupAlert: (alert: string) => ipcRenderer.send('pop-alert', alert),
  searchWorkingFolder: (path: string) =>
    ipcRenderer.send('search-working-folder', path),

  onFolderSelected: (callback: any) =>
    ipcRenderer.on('folder-selected', callback),

  onWorkingFolderIterated: (callback: any) =>
    ipcRenderer.on('working-folder-iterated', callback),
  onFocusWindow: (callback: any) => ipcRenderer.on('window-focus', callback),
  onXWinNotFound: (callback: any) => ipcRenderer.on('xwin-not-found', callback),

  // Listen for code to explain in the ai assistant window
  onCodeToExplain: (callback: any) =>
    ipcRenderer.on('code-to-explain', callback),

  // Streaming explanation events
  onExplanationStart: (callback: any) =>
    ipcRenderer.on('explanation-start', callback),
  onExplanationChunk: (callback: any) =>
    ipcRenderer.on('explanation-chunk', callback),
  onExplanationComplete: (callback: any) =>
    ipcRenderer.on('explanation-complete', callback),
  onExplanationError: (callback: any) =>
    ipcRenderer.on('explanation-error', callback),
  onDetectedLanguage: (callback: any) =>
    ipcRenderer.on('detected-language', callback),
  onSkipExplanation: (callback: any) =>
    ipcRenderer.on('skip-explanation', callback),

  // UI mode control
  notifyExplanationCompleted: (completed: boolean) =>
    ipcRenderer.send('explanation-completed', completed),
  onSetUIMode: (callback: any) => ipcRenderer.on('set-ui-mode', callback),
  notifyUIMode: (mode: string) => ipcRenderer.send('ui-mode-changed', mode),

  // Chat-related events and methods
  sendChatMessage: (message: string, messageHistory: any[]) =>
    ipcRenderer.send('send-chat-message', message, messageHistory),
  onChatResponse: (callback: any) => ipcRenderer.on('chat-response', callback),
  onChatResponseStart: (callback: any) =>
    ipcRenderer.on('chat-response-start', callback),
  onChatResponseChunk: (callback: any) =>
    ipcRenderer.on('chat-response-chunk', callback),
  onChatResponseComplete: (callback: any) =>
    ipcRenderer.on('chat-response-complete', callback),
  onChatResponseError: (callback: any) =>
    ipcRenderer.on('chat-response-error', callback),

  // Settings windows events
  onOpenAIAssistantSettings: (callback: any) =>
    ipcRenderer.on('open-ai-assistant-settings', callback),
  onOpenApiKeySettings: (callback: any) =>
    ipcRenderer.on('open-api-key-settings', callback),
  onOpenLeftClickSettings: (callback: any) =>
    ipcRenderer.on('open-left-click-settings', callback),
});

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
// window.addEventListener("DOMContentLoaded", () => {
//   const replaceText = (selector: string, text: string) => {
//     const element = document.getElementById(selector);
//     if (element) {
//       element.innerText = text;
//     }
//   };

//   for (const type of ["chrome", "node", "electron"]) {
//     replaceText(`${type}-version`, process.versions[type as keyof NodeJS.ProcessVersions]);
//   }
// });
