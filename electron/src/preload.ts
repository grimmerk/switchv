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
  onCodeToGenerateInsight: (callback: any) =>
    ipcRenderer.on('code-to-generate-insight', callback),

  // Streaming explanation events
  onAIAssistantInsightStart: (callback: any) =>
    ipcRenderer.on('ai-assistant-insight-start', callback),
  onAIAssistantInsightChunk: (callback: any) =>
    ipcRenderer.on('ai-assistant-insight-chunk', callback),
  onAIAssistantInsightComplete: (callback: any) =>
    ipcRenderer.on('ai-assistant-insight-complete', callback),
  onAIAssistantInsightError: (callback: any) =>
    ipcRenderer.on('ai-assistant-insight-error', callback),
  onDetectedLanguage: (callback: any) =>
    ipcRenderer.on('detected-language', callback),
  onSkipInsight: (callback: any) =>
    ipcRenderer.on('skip-ai-assistant-insight', callback),

  // UI mode control
  notifyAIAssistantInsightCompleted: (completed: boolean) =>
    ipcRenderer.send('ai-assistant-insight-completed', completed),
  onSetUIMode: (callback: any) => ipcRenderer.on('set-ui-mode', callback),
  notifyUIMode: (mode: string) => ipcRenderer.send('ui-mode-changed', mode),
  onLoadLatestConversation: (callback: any) => ipcRenderer.on('load-latest-conversation', callback),

  // Chat-related events and methods
  sendChatMessage: (message: string, messageHistory: any[], additionalContext?: any) =>
    ipcRenderer.send('send-chat-message', message, messageHistory, additionalContext),
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
    
  // Conversation history APIs
  saveConversation: (conversation: any) => 
    ipcRenderer.invoke('save-conversation', conversation),
  updateConversation: (id: string, conversation: any) => 
    ipcRenderer.invoke('update-conversation', id, conversation),
  getConversation: (id: string) => 
    ipcRenderer.invoke('get-conversation', id),
  getConversations: (params: any) => 
    ipcRenderer.invoke('get-conversations', params),
  getLatestConversation: (isFromCode?: boolean) => 
    ipcRenderer.invoke('get-latest-conversation', isFromCode),
  deleteConversation: (id: string) => 
    ipcRenderer.invoke('delete-conversation', id),
  addMessageToConversation: (id: string, message: any) => 
    ipcRenderer.invoke('add-message-to-conversation', id, message),
  searchConversations: (searchTerm: string) => 
    ipcRenderer.invoke('search-conversations', searchTerm),
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
