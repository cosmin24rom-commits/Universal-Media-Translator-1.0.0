const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  extractAudio: (videoPath, outputDir) => ipcRenderer.invoke('media:extractAudio', videoPath, outputDir),
  extractMp3: (videoPath, outputDir) => ipcRenderer.invoke('media:extractMp3', videoPath, outputDir),
  transcribeAudio: (audioPath, outputDir, apiConfig, language) => ipcRenderer.invoke('media:transcribeAudio', audioPath, outputDir, apiConfig, language),
  translateText: (text, apiConfig, targetLanguage) => ipcRenderer.invoke('ai:translate', text, apiConfig, targetLanguage),
  translateFileDirect: (filePath, apiConfig, targetLanguage) => ipcRenderer.invoke('ai:translateFileDirect', filePath, apiConfig, targetLanguage),
  generateAudio: (text, voice, outputDir, fileName) => ipcRenderer.invoke('media:generateAudio', text, voice, outputDir, fileName),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeTranslated: (srcPath, outputDir, text, lang, fmt) => ipcRenderer.invoke('fs:writeTranslated', srcPath, outputDir, text, lang, fmt),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (_event, data) => callback(data)),
  removeProgressListeners: () => ipcRenderer.removeAllListeners('progress-update'),
});
